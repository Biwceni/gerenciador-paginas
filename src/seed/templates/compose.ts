import { brandCombos, type BrandComboKey } from '../../lib/brand'
import { FONT_PAIRS } from '../../lib/fontPairs'
import { cleanShows, SITE_SHOW_VALUES, type SiteShow, showInfo } from '../../lib/siteShows'
import { templateKey } from '../../lib/templates'
import type { Personality } from '../../lib/theme'
import type { Template } from '../../payload-types'
import type { PageComponent } from '../../puck/schema'
import {
  content,
  EMAIL,
  finishPage,
  longAsk,
  modelForms,
  NAME,
  pageBuilder,
  type TemplateForm,
  toPage,
  WHATSAPP,
} from './sections'

// F1: o site montado pelo que ele precisa mostrar. No lugar de um modelo pronto por ramo, cada
// escolha do Começar vira uma página com a seção principal dela e um atalho na página inicial. Os
// textos são neutros (servem a qualquer negócio) e usam `{nome}` e `{cidade}`, como os modelos.
// Nada é gravado na coleção Modelos: o modelo nasce na hora, no servidor (para montar o site) e no
// navegador (para a prévia do Começar), sempre com o mesmo resultado.

/** Cor principal e escura de partida, neutras: a pessoa troca pelas do logo em Sua marca. */
export const COMPOSE_PALETTE = { accent: '#2b5aa8', dark: '#18222d' } as const

/** Para cada visual: a combinação de cores, o par de letras (`FONT_PAIRS.geral`) e o banner. */
const LOOKS: Record<
  Personality,
  { combo: BrandComboKey; fonts: number; hero: 'side' | 'image' | 'light' }
> = {
  papel: { combo: 'forte', fonts: 1, hero: 'side' },
  classico: { combo: 'claro', fonts: 0, hero: 'side' },
  vitrine: { combo: 'forte', fonts: 1, hero: 'image' },
  aconchego: { combo: 'claro', fonts: 2, hero: 'side' },
  editorial: { combo: 'claro', fonts: 0, hero: 'light' },
}

/** O modelo montado: o mesmo formato de um modelo de site da coleção, sem id. */
export type ComposedTemplate = Pick<
  Template,
  'key' | 'name' | 'description' | 'kind' | 'siteType' | 'photos' | 'site' | 'header' | 'footer'
> & {
  pages: { title: string; slug: string; campaign: boolean; content: ReturnType<typeof content> }[]
  forms: TemplateForm[]
}

const BUTTON = 'Fale com a gente'

/** Formulário da página "Envie um arquivo" (D2): o arquivo é obrigatório e aceita PDF e Word. */
const FILE_FORM: TemplateForm = {
  title: 'Envie um arquivo',
  submitButtonLabel: 'Enviar',
  fields: [
    NAME,
    WHATSAPP,
    EMAIL,
    { type: 'file', name: 'arquivo', label: 'Arquivo', required: true, accept: 'document' },
    longAsk('mensagem', 'Quer contar mais alguma coisa?'),
  ],
}

/** `AAAA-MM-DD` daqui a tantos dias. A agenda de exemplo nunca nasce com datas passadas. */
function dayFrom(today: Date, days: number) {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

type Builder = ReturnType<typeof pageBuilder>

/** A seção principal de cada escolha, com o banner compacto da página por cima. */
const SHOW_PAGES: Record<SiteShow, (b: Builder, today: Date, form: number) => PageComponent[]> = {
  products: (b) => [
    b.hero({
      title: 'Produtos',
      text: 'Veja o que {nome} tem para você. Gostou de algum? Peça pelo WhatsApp.',
      style: 'soft',
      height: 'compact',
    }),
    b.products({
      title: 'Nossos produtos',
      text: 'Troque pelos seus: foto, nome, uma frase e o preço.',
      items: [
        ['Produto em destaque', 'Uma frase curta que conta o que ele tem de bom.', 'R$ 99,90'],
        ['Mais vendido', 'O favorito de quem já comprou com a gente.', 'R$ 59,90'],
        ['Novidade', 'Acabou de chegar. Pergunte as cores e os tamanhos.', 'R$ 79,90'],
        ['Para presentear', 'Vai embrulhado e com cartão, se você quiser.', 'R$ 49,90'],
        ['Kit econômico', 'Leve mais pagando menos.', 'R$ 129,90'],
        ['Sob encomenda', 'Feito do seu jeito. Combine o prazo pelo WhatsApp.', 'Sob consulta'],
      ],
    }),
  ],
  services: (b) => [
    b.hero({
      title: 'Serviços',
      text: 'O que {nome} faz, com preço ou orçamento sem compromisso.',
      style: 'soft',
      height: 'compact',
    }),
    b.priceList({
      title: 'O que fazemos',
      text: 'Troque pelos seus serviços e valores.',
      groups: [
        [
          'Principais',
          [
            ['Serviço principal', 'O que está incluído e quanto tempo leva.', 'R$ 150'],
            ['Serviço completo', 'Tudo do principal e mais um cuidado extra.', 'R$ 250'],
            ['Avaliação', 'Uma conversa para entender o que você precisa.', 'Sem custo'],
          ],
        ],
        [
          'Sob medida',
          [
            ['Projeto especial', 'Para quem precisa de algo fora do comum.', 'Sob consulta'],
            ['Atendimento no local', 'Vamos até você em {cidade} e região.', 'Sob consulta'],
          ],
        ],
      ],
    }),
    b.faq({
      items: [
        ['Como peço um orçamento?', 'Chame no WhatsApp e conte o que você precisa.'],
        ['Quais formas de pagamento?', 'Pix, dinheiro e cartão.'],
        ['Atendem em quais lugares?', 'Em {cidade} e região. Pergunte pelo seu bairro.'],
      ],
    }),
  ],
  units: (b) => [
    b.hero({
      title: 'Unidades',
      text: 'Escolha a unidade mais perto de você. Endereço, horário e telefone de cada uma.',
      style: 'soft',
      height: 'compact',
    }),
    b.units({
      title: 'Nossas unidades',
      text: 'Os endereços e horários vêm das Configurações, em Unidades.',
    }),
  ],
  agenda: (b, today) => [
    b.hero({
      title: 'Agenda',
      text: 'As próximas datas de {nome}. As que já passaram saem sozinhas.',
      style: 'soft',
      height: 'compact',
    }),
    b.events({
      title: 'Próximas datas',
      button: 'Quero participar',
      items: [
        {
          date: dayFrom(today, 14),
          time: '19:00',
          title: 'Primeiro encontro do mês',
          place: '{cidade}',
          text: 'Conte em uma frase o que vai acontecer e para quem é.',
        },
        {
          date: dayFrom(today, 28),
          time: '10:00',
          title: 'Evento especial',
          place: '{cidade}',
          text: 'Vagas limitadas: garanta a sua pelo WhatsApp.',
        },
        {
          date: dayFrom(today, 42),
          time: '18:30',
          title: 'Nova turma',
          place: '{cidade}',
          text: 'Início das aulas. Pergunte os horários.',
        },
      ],
    }),
  ],
  team: (b) => [
    b.hero({
      title: 'Equipe',
      text: 'Conheça quem faz {nome} acontecer.',
      style: 'soft',
      height: 'compact',
    }),
    b.team({
      title: 'Quem atende você',
      items: [
        ['Fundadora', 'Nome da pessoa', 'Uma frase sobre a experiência e o que ela faz.'],
        ['Atendimento', 'Nome da pessoa', 'Uma frase sobre como ela ajuda os clientes.'],
        ['Especialista', 'Nome da pessoa', 'Uma frase sobre a formação e a especialidade.'],
      ],
    }),
  ],
  files: (b, _today, form) => [
    b.hero({
      title: 'Envie um arquivo',
      text: 'Mande a receita, a foto ou o documento por aqui. A gente responde pelo WhatsApp.',
      style: 'soft',
      height: 'compact',
    }),
    b.form({
      title: 'Envie pelo formulário',
      text: 'Aceita foto, PDF ou Word de até 10 MB.',
      form,
      success: 'Recebemos o seu arquivo. Respondemos em breve pelo WhatsApp.',
    }),
  ],
  contact: (b) => [
    b.hero({
      title: 'Contato',
      text: 'Escolha o jeito mais fácil para você falar com {nome}.',
      button: BUTTON,
      style: 'soft',
    }),
    b.contact({ title: 'Onde estamos', text: 'Atendemos em {cidade} e região.' }),
  ],
}

/** Atalho de cada escolha na página inicial. */
const SHOW_CARDS: Record<SiteShow, [title: string, text: string, button: string]> = {
  products: ['Produtos', 'Veja o que temos e peça pelo WhatsApp.', 'Ver os produtos'],
  services: ['Serviços', 'O que fazemos, com preço ou orçamento.', 'Ver os serviços'],
  units: ['Unidades', 'Endereço, horário e mapa de cada unidade.', 'Ver as unidades'],
  agenda: ['Agenda', 'As próximas datas, com os detalhes de cada uma.', 'Ver a agenda'],
  team: ['Equipe', 'Conheça quem atende você.', 'Conhecer a equipe'],
  files: ['Envie um arquivo', 'Mande receita, foto ou documento por aqui.', 'Enviar um arquivo'],
  contact: ['Contato', 'WhatsApp, e-mail e endereço.', 'Falar com a gente'],
}

const CARD_ICONS: Record<
  SiteShow,
  'bag' | 'check' | 'pin' | 'calendar' | 'heart' | 'card' | 'phone'
> = {
  products: 'bag',
  services: 'check',
  units: 'pin',
  agenda: 'calendar',
  team: 'heart',
  files: 'card',
  contact: 'phone',
}

function homePage(b: Builder, shows: SiteShow[], hero: 'side' | 'image' | 'light') {
  const items: PageComponent[] = [
    b.hero({
      title: '{nome}',
      text: 'Conte em uma frase o que você faz e para quem. Ela também aparece no Google.',
      button: BUTTON,
      style: hero,
    }),
  ]
  if (shows.length) {
    const features = b.features({
      title: 'O que você encontra aqui',
      items: shows.map((show) => [SHOW_CARDS[show][0], SHOW_CARDS[show][1], CARD_ICONS[show]]),
    })
    // Cada atalho leva à página da escolha (C3: o item todo vira link).
    if (features.type === 'Features') {
      features.props.items = features.props.items.map((item, index) => ({
        ...item,
        button: { label: SHOW_CARDS[shows[index]][2], link: toPage(index + 2) },
      }))
    }
    items.push(features)
  }
  items.push(
    b.textImage({
      title: 'Sobre {nome}',
      text: 'Conte a sua história: como começou, o que faz de diferente e por que as pessoas voltam. Atendemos em {cidade}.',
      style: 'soft',
    }),
  )
  // Nada marcado: o site é uma página só, com o contato nela.
  if (!shows.length) {
    items.push(b.contact({ title: 'Fale com a gente', text: 'Atendemos em {cidade} e região.' }))
  }
  items.push(
    b.cta({
      title: 'Vamos conversar?',
      text: 'Mande uma mensagem e respondemos rapidinho.',
      button: BUTTON,
    }),
  )
  return items
}

/**
 * O modelo de site para as escolhas do Começar: a página inicial e uma página por escolha, na ordem
 * da tela, com o menu levando a todas. `today` só conta as datas de exemplo da agenda.
 */
export function composeSiteTemplate(
  answers: { shows: readonly SiteShow[]; personality: Personality },
  today = new Date(),
): ComposedTemplate {
  const shows = cleanShows(answers.shows)
  const look = LOOKS[answers.personality]
  const ownForms: TemplateForm[] = shows.includes('files') ? [FILE_FORM] : []
  const forms = modelForms(ownForms, shows.includes('contact'))
  const contactForm = forms.length
  const fileForm = 1

  const built = [
    { title: 'Início', slug: 'inicio', items: homePage(pageBuilder(), shows, look.hero) },
    ...shows.map((show) => {
      const b = pageBuilder()
      const items = finishPage(SHOW_PAGES[show](b, today, fileForm), b, {
        whatsappLabel: BUTTON,
        contactForm,
        internal: true,
      })
      return { ...showInfo(show).page, items }
    }),
  ]
  const fonts = FONT_PAIRS.geral[look.fonts]

  return {
    key: templateKey('geral', answers.personality),
    name: 'Site montado pelo Começar',
    description: null,
    kind: 'site',
    siteType: 'institucional',
    pages: built.map((page) => ({
      title: page.title,
      slug: page.slug,
      campaign: false,
      content: content(page.items),
    })),
    photos: [],
    forms,
    site: {
      name: 'Meu Negócio',
      tagline: 'Uma frase curta sobre o que você faz e para quem.',
      colors: brandCombos(COMPOSE_PALETTE).find((combo) => combo.key === look.combo)!.colors,
      fonts: { headings: fonts.headings, body: fonts.body },
      address: null,
      hours: null,
      whatsappMessage: 'Olá! Vim pelo site e quero mais informações.',
    },
    header: {
      items: built.map((page, index) => ({
        label: page.title,
        link: { kind: 'page' as const, page: index + 1 },
      })),
      button: { label: BUTTON, link: { kind: 'whatsapp' as const } },
    },
    footer: {
      text: '{nome}, em {cidade}.',
      ctaTitle: 'Vamos conversar?',
      showMenu: true,
      showContact: true,
      showSocial: true,
    },
  }
}

/**
 * Todas as páginas que o Começar pode montar (todas as escolhas), para a checagem "Ainda há texto
 * de exemplo" reconhecer os textos delas como reconhece os dos modelos gravados.
 */
export function composedExamplePages(): Pick<ComposedTemplate, 'pages'> {
  return composeSiteTemplate({ shows: SITE_SHOW_VALUES, personality: 'classico' })
}
