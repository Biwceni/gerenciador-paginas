import type { ButtonValue, LinkRef, PageComponent } from '../../puck/schema'

// Montadores das seções dos modelos, com Lorem Ipsum no conteúdo (como o `loremize` do protótipo).
// Nomes de página, menu e botões ficam legíveis. Fotos, páginas e formulários são citados pela
// posição no modelo (ver `src/lib/templates.ts`).

export const L_S = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
export const L_M =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
const L_Q =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation.'
const HERO_TITLE = 'Lorem ipsum dolor sit amet, consectetur'
const TITLES = [
  'Lorem ipsum dolor sit amet',
  'Consectetur adipiscing elit',
  'Sed do eiusmod tempor',
  'Ut enim ad minim veniam',
  'Duis aute irure dolor',
  'Excepteur sint occaecat',
  'Quis nostrud exercitation',
  'Nisi ut aliquip ex ea',
]
const NAMES = ['Lorem Ipsum', 'Dolor Amet', 'Sit Consectetur', 'Elit Tempor']

export const photo = (position: number) => ({ mediaId: position })
export const toPage = (position: number): LinkRef => ({ kind: 'page', pageId: position })
export const toSection = (position: number, sectionId: string): LinkRef => ({
  kind: 'section',
  pageId: position,
  sectionId,
})
export const whatsapp: LinkRef = { kind: 'whatsapp' }

const button = (label: string, link: LinkRef = whatsapp): ButtonValue => ({ label, link })

type Style = 'light' | 'soft' | 'brand'
type Common = { id?: string; menu?: string; style?: Style }

/**
 * Seções de uma página. Os títulos de Lorem Ipsum se revezam, como no protótipo, e cada seção
 * ganha um id único na página (ou o `id` pedido, para o menu poder apontar para ela).
 */
export function pageBuilder() {
  let title = 0
  let count = 0
  const nextTitle = () => TITLES[title++ % TITLES.length]
  const id = (type: string, wanted?: string) => wanted ?? `${type}-${++count}`
  const items = <T>(n: number, make: (index: number) => T) => Array.from({ length: n }, (_, i) => make(i))

  return {
    hero: (o: {
      image?: number
      button?: string
      link?: LinkRef
      style?: 'image' | Style
      align?: 'left' | 'center'
    }): PageComponent => ({
      type: 'Hero',
      props: {
        id: id('Hero'),
        title: HERO_TITLE,
        text: L_S,
        image: o.image ? photo(o.image) : null,
        button: o.button ? button(o.button, o.link) : null,
        style: o.style ?? 'image',
        align: o.align ?? 'left',
      },
    }),
    textImage: (o: Common & { image?: number; side?: 'left' | 'right' }): PageComponent => ({
      type: 'TextImage',
      props: {
        id: id('TextImage', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        text: L_M,
        image: o.image ? photo(o.image) : null,
        side: o.side ?? 'right',
        style: o.style ?? 'light',
      },
    }),
    features: (o: Common & { count?: number } = {}): PageComponent => ({
      type: 'Features',
      props: {
        id: id('Features', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        items: items(o.count ?? 3, () => ({ title: nextTitle(), text: L_S })),
        style: o.style ?? 'light',
      },
    }),
    testimonials: (o: Common & { count?: number } = {}): PageComponent => ({
      type: 'Testimonials',
      props: {
        id: id('Testimonials', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        items: items(o.count ?? 2, (i) => ({ quote: L_Q, name: NAMES[i % NAMES.length] })),
        style: o.style ?? 'soft',
      },
    }),
    faq: (o: Common & { count?: number } = {}): PageComponent => ({
      type: 'Faq',
      props: {
        id: id('Faq', o.id),
        menuLabel: o.menu ?? '',
        title: 'Perguntas frequentes',
        items: items(o.count ?? 3, () => ({ question: `${nextTitle()}?`, answer: L_M })),
        style: o.style ?? 'light',
      },
    }),
    gallery: (o: Common & { images: number[] }): PageComponent => ({
      type: 'Gallery',
      props: {
        id: id('Gallery', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        images: o.images.map(photo),
        style: o.style ?? 'light',
      },
    }),
    cta: (o: Common & { button: string; link?: LinkRef }): PageComponent => ({
      type: 'CallToAction',
      props: {
        id: id('CallToAction', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        text: L_S,
        button: button(o.button, o.link),
        style: o.style ?? 'brand',
      },
    }),
    contact: (o: Common = {}): PageComponent => ({
      type: 'Contact',
      props: {
        id: id('Contact', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        text: L_S,
        style: o.style ?? 'light',
      },
    }),
    form: (o: Common & { form: number }): PageComponent => ({
      type: 'Form',
      props: {
        id: id('Form', o.id),
        menuLabel: o.menu ?? '',
        title: nextTitle(),
        text: L_S,
        form: { formId: o.form },
        successMessage: 'Recebemos seus dados. Obrigado!',
        style: o.style ?? 'soft',
      },
    }),
    links: (o: { items: { label: string; link: LinkRef }[]; style?: Style }): PageComponent => ({
      type: 'LinkList',
      props: {
        id: id('LinkList'),
        // O nome do site entra no lugar ao aplicar o modelo.
        title: 'Lorem Ipsum',
        text: L_S,
        items: o.items.map((item) => button(item.label, item.link)),
        style: o.style ?? 'soft',
      },
    }),
  }
}
