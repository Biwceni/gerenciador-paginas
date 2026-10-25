import type { GlobalBeforeChangeHook, GlobalConfig, TextField } from 'payload'
import { ValidationError } from 'payload'

import { authenticated } from '../access/authenticated'
import { publishedOrAuthenticated } from '../access/published'
import { colorField } from '../fields/color'
import { revalidateGlobalOnPublish } from '../hooks/revalidate'
import { FontNotFoundError, prepareFonts } from '../lib/fonts'
import { normalizeWhatsApp, validateExternalURL, validateInstagram } from '../lib/links'
import { DEFAULT_COLORS, FONT_NAME_PATTERN } from '../lib/theme'

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
 * Só refaz quando as fontes mudam. Rascunho não baixa nada.
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
  if (site._status !== 'published') return data

  const headings = site.fonts?.headings?.trim() || ''
  const body = site.fonts?.body?.trim() || ''
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
    if (error instanceof FontNotFoundError) {
      throw new ValidationError({
        global: 'site',
        errors: [
          {
            path: error.fontName === headings ? 'fonts.headings' : 'fonts.body',
            message: `Não encontramos "${error.fontName}" no Google Fonts. Confira o nome em fonts.google.com.`,
          },
        ],
        req,
      })
    }
    // Falha do Google ou do Storage não impede publicar: fica a fonte anterior e a próxima
    // publicação tenta de novo (a chave não muda).
    req.payload.logger.error({ err: error }, 'Não deu para copiar as fontes do site')
  }
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
    beforeChange: [prepareSiteFonts],
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
            {
              name: 'homepage',
              type: 'relationship',
              relationTo: 'pages',
              label: 'Página inicial',
              admin: {
                description:
                  'A página que abre quando alguém entra no endereço do site. Precisa estar publicada.',
              },
            },
          ],
        },
        {
          label: 'Cores e fontes',
          fields: [
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
                {
                  name: 'whatsapp',
                  type: 'text',
                  label: 'WhatsApp',
                  admin: {
                    description:
                      'Com DDD. Ex.: (31) 99999-0000. Os botões de WhatsApp usam este número.',
                  },
                  validate: (value: null | string | undefined) =>
                    !value || normalizeWhatsApp(value)
                      ? true
                      : 'Digite o número com DDD. Ex.: (31) 99999-0000.',
                },
                { name: 'phone', type: 'text', label: 'Telefone' },
                { name: 'email', type: 'email', label: 'E-mail' },
                { name: 'address', type: 'textarea', label: 'Endereço' },
                {
                  name: 'hours',
                  type: 'text',
                  label: 'Horário de funcionamento',
                  maxLength: 120,
                  admin: { description: 'Ex.: Seg a sáb, das 7h às 19h.' },
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
