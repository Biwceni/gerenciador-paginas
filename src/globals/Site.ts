import type { GlobalBeforeChangeHook, GlobalConfig, TextField } from 'payload'
import { ValidationError } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { colorField } from '../fields/color'
import { HEX_COLOR_PATTERN } from '../lib/colors'
import { validateCNPJ } from '../lib/company'
import { revalidateGlobalOnPublish } from '../hooks/revalidate'
import { FontNotFoundError, prepareFonts, resolveFontNames } from '../lib/fonts'
import { normalizeWhatsApp, validateExternalURL, validateInstagram } from '../lib/links'
import { DEFAULT_MOTION, MOTION_LABELS, MOTIONS } from '../lib/motion'
import {
  formatPhone,
  mainContact,
  toUnit,
  toUnitData,
  UNITS_MAX,
  type UnitData,
} from '../lib/units'
import {
  DEFAULT_COLORS,
  DEFAULT_PERSONALITY,
  FONT_NAME_PATTERN,
  PERSONALITIES,
  PERSONALITY_LABELS,
} from '../lib/theme'

const fontField = (name: string, label: string): TextField => ({
  name,
  type: 'text',
  label,
  admin: {
    description:
      'Nome de uma fonte do Google Fonts, como "Poppins" ou "Lora". Em branco, usa a fonte padrão.',
  },
  validate: (value: null | string | undefined) =>
    !value || FONT_NAME_PATTERN.test(value) ? true : 'Use só o nome da fonte, sem símbolos.',
})

const socialField = (name: string, label: string): TextField => ({
  name,
  type: 'text',
  label,
  validate: (value: null | string | undefined) => (value ? validateExternalURL(value) : true),
})

type SiteData = {
  _status?: 'draft' | 'published' | null
  fonts?: { headings?: string | null; body?: string | null }
  fontFaces?: string | null
  fontKey?: string | null
}

/**
 * Ao publicar, copia as fontes escolhidas do Google Fonts para o nosso Storage e guarda o CSS
 * pronto: o site não depende do Google nem manda o endereço do visitante para lá (LGPD).
 * Só refaz quando as fontes mudam. Rascunho não baixa nada: só confere no Google a fonte que mudou,
 * para recusar logo a que não existe.
 *
 * `fontFaces` e `fontKey` só são escritos aqui: o que vier na requisição é descartado (o campo
 * escondido no painel ainda é aceito pela API, e o CSS vai para a página). O layout também
 * escapa o CSS, como segunda defesa.
 */
export const prepareSiteFonts: GlobalBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const site = data as SiteData
  const previous = originalDoc as SiteData | undefined
  site.fontFaces = previous?.fontFaces ?? null
  site.fontKey = previous?.fontKey ?? null

  const headings = site.fonts?.headings?.trim() || ''
  const body = site.fonts?.body?.trim() || ''
  const notFound = (error: FontNotFoundError) =>
    new ValidationError({
      global: 'site',
      errors: [
        {
          path: error.fontName === headings ? 'fonts.headings' : 'fonts.body',
          message: `Não encontramos "${error.fontName}" no Google Fonts. Confira o nome em fonts.google.com.`,
        },
      ],
      req,
    })

  if (site._status !== 'published') {
    const changed = [headings, body].filter(
      (name, index) => name && name !== (index ? previous?.fonts?.body : previous?.fonts?.headings),
    )
    if (!changed.length) return data
    try {
      const resolved = await resolveFontNames(changed)
      site.fonts = {
        headings: headings ? (resolved[headings] ?? headings) : null,
        body: body ? (resolved[body] ?? body) : null,
      }
    } catch (error) {
      if (error instanceof FontNotFoundError) throw notFound(error)
      // Google fora do ar: guarda assim mesmo, e o publicar confere de novo.
      req.payload.logger.error({ err: error }, 'Não deu para conferir as fontes do rascunho')
    }
    return data
  }

  const key = `${headings}|${body}`
  if (key === previous?.fontKey && previous?.fontFaces) return data

  try {
    const { css, resolved } = await prepareFonts([headings, body])
    site.fonts = {
      headings: headings ? resolved[headings] : null,
      body: body ? resolved[body] : null,
    }
    site.fontFaces = css
    site.fontKey = `${site.fonts.headings ?? ''}|${site.fonts.body ?? ''}`
  } catch (error) {
    if (error instanceof FontNotFoundError) throw notFound(error)
    // Falha do Google ou do Storage não impede publicar: fica a fonte anterior e a próxima
    // publicação tenta de novo (a chave não muda).
    req.payload.logger.error({ err: error }, 'Não deu para copiar as fontes do site')
  }
  return data
}

type ContactData = {
  units?: UnitData[] | null
  whatsapp?: string | null
  phone?: string | null
  address?: string | null
  hours?: string | null
}

/**
 * D1: as unidades conferidas (horário e datas especiais limpos, telefones formatados) e os campos
 * de sempre do contato copiados da primeira. Quem grava sem unidade, mas com o contato de sempre (o
 * seed, uma chamada antiga da API), tem esse contato levado para a primeira unidade. Com unidades,
 * os campos de sempre são só cópia: mudar o contato é mudar as unidades.
 */
export const syncUnits: GlobalBeforeChangeHook = ({ data, originalDoc }) => {
  const contact = (data as { contact?: ContactData }).contact
  if (!contact) return data
  const before = (originalDoc as { contact?: ContactData } | undefined)?.contact
  // Quem muda só os campos de sempre (uma chamada antiga da API, um script), sem mexer na lista:
  // a mudança vai para a primeira unidade, para não ser desfeita pela cópia logo abaixo.
  if (Array.isArray(contact.units) && contact.units.length && before) {
    const same = (a: unknown, b: unknown) => ((a as string) || '') === ((b as string) || '')
    const unitsKept =
      JSON.stringify((before.units ?? []).map(toUnit)) === JSON.stringify(contact.units.map(toUnit))
    if (unitsKept) {
      const first = { ...contact.units[0] }
      if (!same(contact.whatsapp, before.whatsapp)) first.whatsapp = contact.whatsapp
      if (!same(contact.phone, before.phone)) first.phone = contact.phone
      if (!same(contact.address, before.address)) first.address = contact.address
      if (!same(contact.hours, before.hours)) {
        first.schedule = null
        first.hoursNote = contact.hours
      }
      contact.units = [first, ...contact.units.slice(1)]
    }
  }
  // Sem unidade, mas com o contato de sempre preenchido: ele vira a primeira. (O painel, quando a
  // pessoa tira todas, manda os campos de sempre vazios.)
  if (!Array.isArray(contact.units) || !contact.units.length) {
    const legacy = {
      whatsapp: contact.whatsapp,
      phone: contact.phone,
      address: contact.address,
      hoursNote: contact.hours,
    }
    contact.units = Object.values(legacy).some((value) => value?.trim()) ? [legacy] : []
  }
  const units = contact.units.slice(0, UNITS_MAX).map(toUnit)
  contact.units = units.map((unit, index) => ({
    ...toUnitData(unit),
    // Linha nova sem id: o Payload cria um.
    id: contact.units?.[index]?.id || undefined,
  }))
  Object.assign(
    contact,
    mainContact(
      units.map((unit) => ({
        ...unit,
        whatsapp: formatPhone(unit.whatsapp),
        phone: formatPhone(unit.phone),
        phone2: formatPhone(unit.phone2),
      })),
    ),
  )
  return data
}

export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Configurações do site',
  access: {
    read: publishedOrAuthenticated,
    readVersions: authenticated,
    update: authenticated,
  },
  admin: {
    group: 'Site',
  },
  versions: {
    drafts: true,
    max: 20,
  },
  hooks: {
    beforeChange: [syncUnits, prepareSiteFonts],
    afterChange: [revalidateGlobalOnPublish],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Identidade',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Nome do negócio',
              required: true,
              maxLength: 80,
            },
            {
              name: 'tagline',
              type: 'textarea',
              label: 'Frase de apresentação',
              maxLength: 200,
              admin: {
                description:
                  'Uma frase curta sobre o negócio. A primeira frase também vai no título da página inicial no Google.',
              },
            },
            {
              name: 'logo',
              type: 'upload',
              relationTo: 'media',
              label: 'Logo',
              admin: { description: 'Sem logo, o site usa as iniciais do nome.' },
            },
            // A3: com logo, o topo mostra só o logo; o nome continua para o leitor de tela.
            {
              name: 'showNameWithLogo',
              type: 'checkbox',
              label: 'Mostrar o nome ao lado do logo',
              defaultValue: false,
              admin: {
                description:
                  'Desligado, o topo mostra só o logo. Ligue se o logo não tem o nome escrito.',
              },
            },
            // E2: o logo sobre fundo escuro (rodapé escuro, topo escuro ou por cima da foto).
            {
              name: 'logoLight',
              type: 'upload',
              relationTo: 'media',
              label: 'Versão clara do logo',
              admin: {
                description:
                  'Usada no lugar do logo sobre fundo escuro: rodapé, topo escuro e topo por cima da foto.',
              },
            },
            {
              name: 'logoOnDark',
              type: 'select',
              label: 'Logo sobre fundo escuro (sem a versão clara)',
              defaultValue: 'auto',
              options: [
                { value: 'auto', label: 'Como está (com contorno quando some no fundo)' },
                { value: 'white', label: 'Versão branca' },
                { value: 'plate', label: 'Placa branca atrás do logo' },
              ],
            },
            // D3: dados da empresa, que o rodapé mostra numa linha embaixo.
            {
              name: 'company',
              type: 'group',
              label: 'Dados da empresa',
              admin: { description: 'Opcional. Aparecem numa linha no fim do rodapé.' },
              fields: [
                { name: 'legalName', type: 'text', label: 'Razão social', maxLength: 120 },
                {
                  name: 'cnpj',
                  type: 'text',
                  label: 'CNPJ',
                  maxLength: 18,
                  validate: (value: null | string | undefined) => validateCNPJ(value),
                },
                {
                  name: 'responsible',
                  type: 'text',
                  label: 'Responsável técnico',
                  maxLength: 120,
                  admin: { description: 'Nome e registro. Ex.: Dra. Ana Lima · CRF-MG 12345.' },
                },
              ],
            },
            // Calculado em Sua marca a partir das cores do logo (T6): logo que some no fundo do topo
            // ou do rodapé ganha um contorno.
            {
              name: 'logoRing',
              type: 'group',
              admin: { hidden: true },
              fields: [
                { name: 'header', type: 'checkbox', defaultValue: false },
                { name: 'footer', type: 'checkbox', defaultValue: false },
              ],
            },
            {
              name: 'homepage',
              type: 'relationship',
              relationTo: 'pages',
              label: 'Página inicial',
              admin: {
                description:
                  'A página que abre quando alguém entra no endereço do site. Enquanto ela não estiver publicada, o site mostra o aviso "em construção".',
              },
            },
            {
              name: 'privacyPage',
              type: 'relationship',
              relationTo: 'pages',
              label: 'Página de privacidade',
              admin: {
                description:
                  'Quando ela estiver publicada, o link "Privacidade" aparece no rodapé e nos formulários.',
              },
            },
          ],
        },
        {
          label: 'Cores e fontes',
          fields: [
            {
              name: 'personality',
              type: 'select',
              label: 'Visual do site',
              defaultValue: DEFAULT_PERSONALITY,
              options: PERSONALITIES.map((value) => ({
                value,
                label: PERSONALITY_LABELS[value].name,
              })),
              admin: {
                description:
                  'Muda formas, tamanhos e a arrumação do banner e das seções em todas as páginas. O conteúdo não muda.',
              },
            },
            {
              name: 'motion',
              type: 'select',
              label: 'Animação do site',
              defaultValue: DEFAULT_MOTION,
              options: MOTIONS.map((value) => ({ value, label: MOTION_LABELS[value].name })),
              admin: {
                description:
                  'Vale para todas as seções que estão em “Igual ao site”. No editor, cada seção pode ter a sua própria animação ou ficar sem. Quem pediu ao celular para reduzir movimentos vê só um esmaecer.',
              },
            },
            {
              name: 'colors',
              type: 'group',
              label: 'Cores',
              admin: {
                description:
                  'A cor do texto dos botões e do rodapé é escolhida sozinha, para ficar fácil de ler.',
              },
              fields: [
                colorField('primary', 'Cor principal (botões e destaques)', DEFAULT_COLORS.primary),
                colorField('background', 'Fundo', DEFAULT_COLORS.background),
                colorField('surface', 'Fundo suave (faixas e caixas)', DEFAULT_COLORS.surface),
                colorField('text', 'Texto', DEFAULT_COLORS.text),
                colorField('footer', 'Rodapé', DEFAULT_COLORS.footer),
                // E1: segunda cor, opcional. Sem ela, vale a principal.
                {
                  name: 'second',
                  type: 'text',
                  label: 'Segunda cor (faixa de aviso, selos e ofertas)',
                  admin: {
                    description: 'Opcional. Em branco, esses lugares usam a cor principal.',
                  },
                  validate: (value: null | string | undefined) =>
                    !value || HEX_COLOR_PATTERN.test(value) ? true : 'Escolha uma cor.',
                },
              ],
            },
            {
              name: 'fonts',
              type: 'group',
              label: 'Fontes',
              admin: {
                description:
                  'A fonte é copiada do Google Fonts para o seu site quando você publica.',
              },
              fields: [
                fontField('headings', 'Fonte dos títulos'),
                fontField('body', 'Fonte dos textos'),
              ],
            },
            // Gerados ao publicar (`prepareSiteFonts`): o CSS das fontes e de quais fontes ele é.
            { name: 'fontFaces', type: 'textarea', admin: { hidden: true } },
            { name: 'fontKey', type: 'text', admin: { hidden: true } },
          ],
        },
        {
          label: 'Contato',
          fields: [
            {
              name: 'contact',
              type: 'group',
              label: 'Contato',
              admin: {
                description: 'Aparece no rodapé e nas seções de contato de todas as páginas.',
              },
              fields: [
                // D1: as unidades do negócio. A primeira é a principal: os campos de baixo
                // (WhatsApp, telefone, endereço e horário) são cópia dela (`syncUnits`).
                {
                  name: 'units',
                  type: 'array',
                  label: 'Unidades',
                  labels: { singular: 'Unidade', plural: 'Unidades' },
                  maxRows: UNITS_MAX,
                  admin: {
                    description:
                      'A primeira é a principal: o rodapé, o topo e os botões de WhatsApp usam os dados dela.',
                  },
                  validate: (rows: unknown) =>
                    Array.isArray(rows) &&
                    rows.length > 1 &&
                    rows.some((row) => !(row as UnitData)?.name?.trim())
                      ? 'Com mais de uma unidade, dê um nome a cada uma.'
                      : true,
                  fields: [
                    { name: 'name', type: 'text', label: 'Nome da unidade', maxLength: 60 },
                    { name: 'address', type: 'textarea', label: 'Endereço', maxLength: 300 },
                    { name: 'phone', type: 'text', label: 'Telefone', maxLength: 40 },
                    { name: 'phone2', type: 'text', label: 'Outro telefone', maxLength: 40 },
                    {
                      name: 'whatsapp',
                      type: 'text',
                      label: 'WhatsApp',
                      maxLength: 40,
                      validate: (value: null | string | undefined) =>
                        !value || normalizeWhatsApp(value)
                          ? true
                          : 'Digite o número com DDD. Ex.: (31) 99999-0000.',
                    },
                    // Os 7 dias, de domingo a sábado: { open, close } ou null (fechado).
                    { name: 'schedule', type: 'json', label: 'Horário da semana' },
                    {
                      name: 'hoursNote',
                      type: 'text',
                      label: 'Observação do horário',
                      maxLength: 120,
                    },
                    // Feriados e horário especial: { date, label, closed, open, close }.
                    { name: 'specials', type: 'json', label: 'Feriados e horário especial' },
                  ],
                },
                {
                  name: 'whatsapp',
                  type: 'text',
                  label: 'WhatsApp',
                  admin: { hidden: true },
                  validate: (value: null | string | undefined) =>
                    !value || normalizeWhatsApp(value)
                      ? true
                      : 'Digite o número com DDD. Ex.: (31) 99999-0000.',
                },
                { name: 'phone', type: 'text', label: 'Telefone', admin: { hidden: true } },
                { name: 'email', type: 'email', label: 'E-mail' },
                {
                  name: 'address',
                  type: 'textarea',
                  label: 'Endereço',
                  admin: { hidden: true },
                },
                {
                  name: 'hours',
                  type: 'text',
                  label: 'Horário de funcionamento',
                  admin: { hidden: true },
                },
                {
                  name: 'whatsappMessage',
                  type: 'text',
                  label: 'Mensagem que já vem escrita no WhatsApp',
                  maxLength: 200,
                  admin: {
                    description:
                      'Quem toca num botão de WhatsApp do site já encontra este texto, com a página de onde veio.',
                  },
                },
                {
                  name: 'whatsappFloat',
                  type: 'group',
                  label: 'Botão do WhatsApp no canto da tela',
                  fields: [
                    {
                      name: 'phone',
                      type: 'checkbox',
                      label: 'Mostrar no celular',
                      defaultValue: true,
                    },
                    {
                      name: 'desktop',
                      type: 'checkbox',
                      label: 'Mostrar também no computador',
                      defaultValue: false,
                    },
                  ],
                },
              ],
            },
            {
              name: 'social',
              type: 'group',
              label: 'Redes sociais',
              admin: { description: 'Deixe em branco o que não usa.' },
              fields: [
                {
                  name: 'instagram',
                  type: 'text',
                  label: 'Instagram',
                  admin: { description: 'O perfil, como @seunegocio.' },
                  validate: (value: null | string | undefined) => validateInstagram(value),
                },
                socialField('facebook', 'Facebook (endereço completo)'),
                socialField('youtube', 'YouTube (endereço completo)'),
                socialField('tiktok', 'TikTok (endereço completo)'),
                socialField('linkedin', 'LinkedIn (endereço completo)'),
              ],
            },
          ],
        },
        {
          label: 'Google e compartilhamento',
          fields: [
            {
              name: 'seoDescription',
              type: 'textarea',
              label: 'Descrição do site no Google',
              maxLength: 160,
              admin: {
                description: 'Usada quando uma página não tem frase própria. Até 160 letras.',
              },
            },
            {
              name: 'shareImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Foto ao compartilhar o site',
              admin: {
                description:
                  'Aparece quando alguém manda o link do site no WhatsApp ou nas redes. Cada página pode ter a sua.',
              },
            },
          ],
        },
      ],
    },
  ],
}
