import { PRIVACY_TITLE } from '../../lib/privacy'
import type { ButtonValue, FeatureIconName, LinkRef, PageComponent } from '../../puck/schema'

// Montadores das seções dos modelos (redesign v3, entrega 6). Os textos são de exemplo, no ramo do
// cliente, com `{nome}` e `{cidade}` no lugar do nome do negócio e da cidade (trocados ao aplicar o
// modelo; ver `fillExamples` em `src/lib/templates.ts`). Nenhuma foto: o lugar dela fica vazio, com
// o aviso "Escolha uma foto sua" no editor e uma ilustração na prévia do modelo. Páginas e
// formulários são citados pela posição no modelo (ver `src/lib/templates.ts`).

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

/** Item de destaque: título, texto e, quando a seção usa ícones, o ícone. */
export type FeatureItem = [title: string, text: string, icon?: FeatureIconName]
/** Produto da vitrine: nome, frase curta e preço (texto livre). */
export type ProductItem = [name: string, text: string, price: string]
/** Item do cardápio: nome, descrição curta e preço. */
export type PriceItem = [name: string, description: string, price: string]

/** Seções de uma página, cada uma com um id único na página (ou o `id` pedido, para o menu). */
export function pageBuilder() {
  let count = 0
  const id = (type: string, wanted?: string) => wanted ?? `${type}-${++count}`

  return {
    /**
     * Banner. Com `style` "image" (foto de fundo) ou "side" (foto ao lado), o lugar da foto fica
     * vazio até a pessoa escolher uma; os outros estilos não usam foto.
     */
    hero: (o: {
      title: string
      text: string
      button?: string
      link?: LinkRef
      highlight?: string
      style?: 'image' | 'side' | Style
      align?: 'left' | 'center'
      height?: 'normal' | 'compact'
    }): PageComponent => ({
      type: 'Hero',
      props: {
        id: id('Hero'),
        title: o.title,
        text: o.text,
        image: null,
        button: o.button ? button(o.button, o.link) : null,
        style: o.style ?? 'image',
        anim: 'site',
        align: o.align ?? 'left',
        height: o.height ?? 'normal',
        highlight: o.highlight ?? '',
      },
    }),
    textImage: (
      o: Common & { title: string; text: string; side?: 'left' | 'right' },
    ): PageComponent => ({
      type: 'TextImage',
      props: {
        id: id('TextImage', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        text: o.text,
        image: null,
        side: o.side ?? 'right',
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    /** Destaques. `marker`: ícone por item (padrão quando os itens têm ícone), números ou nada. */
    features: (
      o: Common & { title: string; items: FeatureItem[]; marker?: 'icon' | 'number' | 'none' },
    ): PageComponent => ({
      type: 'Features',
      props: {
        id: id('Features', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        marker: o.marker ?? (o.items.some((item) => item[2]) ? 'icon' : 'none'),
        items: o.items.map(([title, text, icon]) => ({
          title,
          text,
          icon: icon ?? 'check',
          photo: null,
        })),
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    testimonials: (
      o: Common & { title: string; items: [quote: string, name: string][] },
    ): PageComponent => ({
      type: 'Testimonials',
      props: {
        id: id('Testimonials', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        items: o.items.map(([quote, name]) => ({ quote, name, photo: null })),
        style: o.style ?? 'soft',
        anim: 'site',
      },
    }),
    faq: (
      o: Common & { title?: string; items: [question: string, answer: string][] },
    ): PageComponent => ({
      type: 'Faq',
      props: {
        id: id('Faq', o.id),
        menuLabel: o.menu ?? '',
        title: o.title ?? 'Perguntas frequentes',
        items: o.items.map(([question, answer]) => ({ question, answer })),
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    /** Galeria sem fotos: a pessoa escolhe as dela (o editor mostra o aviso no lugar). */
    gallery: (o: Common & { title: string; layout?: 'grid' | 'masonry' }): PageComponent => ({
      type: 'Gallery',
      props: {
        id: id('Gallery', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        images: [],
        layout: o.layout ?? 'grid',
        showCaptions: false,
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    cta: (
      o: Common & { title: string; text: string; button: string; link?: LinkRef },
    ): PageComponent => ({
      type: 'CallToAction',
      props: {
        id: id('CallToAction', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        text: o.text,
        button: button(o.button, o.link),
        style: o.style ?? 'brand',
        anim: 'site',
      },
    }),
    contact: (o: Common & { title: string; text: string }): PageComponent => ({
      type: 'Contact',
      props: {
        id: id('Contact', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        text: o.text,
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    // O texto sai das Configurações, na hora de mostrar (`lib/privacy.ts`).
    privacy: (o: Common = {}): PageComponent => ({
      type: 'Privacy',
      props: {
        id: id('Privacy', o.id),
        menuLabel: o.menu ?? '',
        title: PRIVACY_TITLE,
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    form: (
      o: Common & { title: string; text: string; form: number; success?: string },
    ): PageComponent => ({
      type: 'Form',
      props: {
        id: id('Form', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        text: o.text,
        form: { formId: o.form },
        successMessage: o.success ?? 'Recebemos sua mensagem. Respondemos em breve pelo WhatsApp.',
        style: o.style ?? 'soft',
        anim: 'site',
      },
    }),
    links: (o: {
      text: string
      items: { label: string; link: LinkRef }[]
      style?: Style
    }): PageComponent => ({
      type: 'LinkList',
      props: {
        id: id('LinkList'),
        title: '{nome}',
        text: o.text,
        items: o.items.map((item) => button(item.label, item.link)),
        style: o.style ?? 'soft',
        anim: 'site',
      },
    }),
    /** Vitrine de produtos, sem fotos: cada produto pede a foto antes de ir ao ar. */
    products: (
      o: Common & {
        title: string
        text?: string
        layout?: 'three' | 'two' | 'list'
        items: ProductItem[]
        /** Texto do botão de cada produto, que monta a mensagem do WhatsApp com o nome dele. */
        button?: string
      },
    ): PageComponent => ({
      type: 'Products',
      props: {
        id: id('Products', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        text: o.text ?? '',
        layout: o.layout ?? 'three',
        items: o.items.map(([name, text, price]) => ({
          image: null,
          name,
          text,
          price,
          button: button(o.button ?? 'Pedir pelo WhatsApp'),
        })),
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    priceList: (
      o: Common & {
        title: string
        text?: string
        columns?: 'one' | 'two'
        leader?: 'dots' | 'line'
        groups: [name: string, items: PriceItem[]][]
      },
    ): PageComponent => ({
      type: 'PriceList',
      props: {
        id: id('PriceList', o.id),
        menuLabel: o.menu ?? '',
        title: o.title,
        text: o.text ?? '',
        columns: o.columns ?? (o.groups.length > 1 ? 'two' : 'one'),
        leader: o.leader ?? 'dots',
        groups: o.groups.map(([name, items]) => ({
          name,
          image: null,
          items: items.map(([itemName, description, price]) => ({
            name: itemName,
            description,
            price,
          })),
        })),
        style: o.style ?? 'light',
        anim: 'site',
      },
    }),
    announcement: (o: {
      items: string[]
      mode?: 'move' | 'static'
      style?: Style
    }): PageComponent => ({
      type: 'Announcement',
      props: {
        id: id('Announcement'),
        items: o.items.map((text) => ({ text })),
        mode: o.mode ?? 'move',
        style: o.style ?? 'brand',
      },
    }),
  }
}
