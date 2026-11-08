import type { Payload } from 'payload'

import type { Page } from '../payload-types'
import {
  type ColumnPiece,
  CONTENT_VERSION,
  type PageComponent,
  type PageContent,
} from '../puck/schema'

// Páginas de teste, com exemplos das seções. Seguem o modelo "Café, Aconchegante" do
// protótipo navegável, com textos de exemplo de uma cafeteria.
//
// Sem `recreate`, só cria o que ainda não existe: rodar de novo não apaga nem sobrescreve nada que
// alguém mudou no painel. Com `recreate` (npm run seed -- recriar), apaga as páginas criadas pelo
// script (marcadas com `createdBySeed`) e regrava as configurações, o cabeçalho e o rodapé.
// Quem chama confere antes se o banco pode receber dados de teste (`src/seed/run.ts`).

const SHORT = 'Café especial torrado toda semana, aqui mesmo na loja.'
const LONG =
  'Escolhemos os grãos direto de pequenos produtores da Serra da Mantiqueira e torramos em pequenos lotes. Assim o café chega na sua xícara com todo o aroma.'
const HERO_TITLE = 'Café fresquinho, do jeito que você gosta'

const columnText = (id: string, title: string): ColumnPiece => ({
  type: 'ColumnText',
  props: { id, title, text: LONG },
})

const content = (items: PageComponent[]): PageContent => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: items },
})

type Refs = { ids: Record<string, number>; photo: (index: number) => { mediaId: number } | null }

type SeedPage = {
  slug: string
  title: string
  status: 'draft' | 'published'
  items: (refs: Refs) => PageComponent[]
}

const whatsapp = { kind: 'whatsapp' as const }

const pages: SeedPage[] = [
  {
    slug: 'novidades',
    title: 'Novidades',
    // Rascunho de propósito: os links para ela não podem aparecer no site.
    status: 'draft',
    items: () => [
      {
        type: 'CallToAction',
        props: {
          id: 'cta-novidades',
          menuLabel: '',
          title: 'Novidades',
          text: SHORT,
          button: null,
          style: 'soft',
          anim: 'site',
        },
      },
    ],
  },
  {
    slug: 'contato',
    title: 'Contato',
    status: 'published',
    items: ({ photo }) => [
      {
        type: 'Hero',
        props: {
          id: 'hero-contato',
          title: HERO_TITLE,
          text: SHORT,
          image: photo(2),
          button: { label: 'Chamar no WhatsApp', link: whatsapp },
          style: 'soft',
          anim: 'site',
          align: 'left',
          height: 'normal',
          highlight: '',
        },
      },
      {
        type: 'Contact',
        props: {
          id: 'contato-endereco',
          menuLabel: 'Endereço',
          title: 'Venha nos visitar',
          text: SHORT,
          style: 'light',
          anim: 'site',
        },
      },
      {
        type: 'Faq',
        props: {
          id: 'contato-perguntas',
          menuLabel: 'Perguntas',
          title: 'Perguntas frequentes',
          items: [
            { question: 'Vocês entregam?', answer: 'Entregamos no centro e nos bairros vizinhos.' },
            {
              question: 'Tem opção sem lactose?',
              answer: 'Temos leite vegetal de aveia e de amêndoas.',
            },
            { question: 'Vendem o café em grãos?', answer: LONG },
          ],
          style: 'soft',
          anim: 'site',
        },
      },
    ],
  },
  {
    slug: 'nossos-cafes',
    title: 'Nossos cafés',
    status: 'published',
    items: ({ ids }) => [
      {
        type: 'Hero',
        props: {
          id: 'hero-cafes',
          title: HERO_TITLE,
          text: SHORT,
          image: null,
          button: { label: 'Pedir pelo WhatsApp', link: whatsapp },
          style: 'brand',
          anim: 'site',
          align: 'center',
          height: 'normal',
          highlight: '',
        },
      },
      {
        type: 'Columns',
        props: {
          id: 'colunas-cafes',
          menuLabel: '',
          layout: 'thirds',
          column1: [columnText('coluna-1', 'Café da casa')],
          column2: [columnText('coluna-2', 'Café coado')],
          column3: [columnText('coluna-3', 'Café gelado')],
          style: 'light',
          anim: 'site',
        },
      },
      {
        type: 'CallToAction',
        props: {
          id: 'cta-cafes',
          menuLabel: '',
          title: 'Novidades em breve',
          text: 'Este botão leva para uma página em rascunho, então ele não aparece no site.',
          button: { label: 'Ver novidades', link: { kind: 'page', pageId: ids.novidades } },
          style: 'soft',
          anim: 'site',
        },
      },
    ],
  },
  {
    slug: 'sobre',
    title: 'Sobre nós',
    status: 'published',
    items: ({ ids, photo }) => [
      {
        type: 'Hero',
        props: {
          id: 'hero-sobre',
          title: HERO_TITLE,
          text: SHORT,
          image: photo(1),
          button: { label: 'Fale com a gente', link: whatsapp },
          style: 'image',
          anim: 'site',
          align: 'left',
          height: 'normal',
          highlight: '',
        },
      },
      {
        type: 'TextImage',
        props: {
          id: 'texto-sobre',
          menuLabel: '',
          title: 'Nossa história',
          text: LONG,
          image: photo(0),
          side: 'left',
          style: 'light',
          anim: 'site',
        },
      },
      {
        type: 'Features',
        props: {
          id: 'destaques-sobre',
          menuLabel: '',
          title: 'Por que nosso café é diferente',
          marker: 'none',
          items: ['Grão escolhido', 'Torra semanal', 'Preparo na hora'].map((title) => ({
            title,
            text: SHORT,
            icon: 'check' as const,
            photo: null,
          })),
          style: 'light',
          anim: 'site',
        },
      },
      {
        type: 'Testimonials',
        props: {
          id: 'depoimentos-sobre',
          menuLabel: '',
          title: 'Quem já provou',
          items: [
            {
              quote: 'O melhor cappuccino da cidade. Virei cliente de todo dia.',
              name: 'Ana P.',
              photo: null,
            },
            {
              quote: 'Compro o café em grãos toda semana. Sempre fresquinho.',
              name: 'João M.',
              photo: null,
            },
          ],
          style: 'soft',
          anim: 'site',
        },
      },
      {
        type: 'Gallery',
        props: {
          id: 'galeria-sobre',
          menuLabel: '',
          title: 'Nosso cantinho',
          images: [photo(0), photo(1), photo(2)]
            .filter((ref) => ref !== null)
            .map((ref) => ({ ...ref, caption: '' })),
          layout: 'grid',
          showCaptions: false,
          style: 'light',
          anim: 'site',
        },
      },
      {
        type: 'CallToAction',
        props: {
          id: 'cta-sobre',
          menuLabel: '',
          title: 'Venha tomar um café',
          text: SHORT,
          button: { label: 'Ver endereço', link: { kind: 'page', pageId: ids.contato } },
          style: 'brand',
          anim: 'site',
        },
      },
    ],
  },
  {
    slug: 'inicio',
    title: 'Início',
    status: 'published',
    items: ({ ids, photo }) => [
      {
        type: 'Hero',
        props: {
          id: 'hero-inicio',
          title: HERO_TITLE,
          text: SHORT,
          image: photo(0),
          button: {
            label: 'Conheça nossos cafés',
            link: { kind: 'page', pageId: ids['nossos-cafes'] },
          },
          style: 'image',
          anim: 'site',
          align: 'left',
          height: 'normal',
          highlight: '',
        },
      },
      {
        type: 'TextImage',
        props: {
          id: 'texto-inicio',
          menuLabel: '',
          title: 'Do grão à xícara',
          text: LONG,
          image: photo(1),
          side: 'right',
          style: 'soft',
          anim: 'site',
        },
      },
      {
        type: 'CallToAction',
        props: {
          id: 'cta-inicio',
          menuLabel: '',
          title: 'Bateu a vontade?',
          text: SHORT,
          button: { label: 'Pedir pelo WhatsApp', link: whatsapp },
          style: 'brand',
          anim: 'site',
        },
      },
    ],
  },
]

const pageLink = (id: number) => ({ kind: 'page' as const, page: id })

export async function seed(payload: Payload, { recreate = false } = {}): Promise<void> {
  if (recreate) {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { createdBySeed: { equals: true } },
      draft: true,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    for (const doc of docs) {
      // O `recriar` refaz também as configurações e o menu, então pode apagar a página inicial e
      // as do menu (ver `protectPageDelete`).
      await payload.delete({
        collection: 'pages',
        id: doc.id,
        overrideAccess: true,
        context: { seedRecreate: true },
      })
      payload.logger.info(`Página de teste apagada: /${doc.slug}`)
    }
  }

  const { docs: photos } = await payload.find({
    collection: 'media',
    sort: '-createdAt',
    limit: 3,
    depth: 0,
    overrideAccess: true,
  })
  if (!photos.length)
    payload.logger.info('Nenhuma foto na biblioteca: as páginas de teste ficam sem foto.')
  const photo = (index: number) =>
    photos.length ? { mediaId: photos[index % photos.length].id } : null

  const ids: Record<string, number> = {}
  for (const page of pages) {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: page.slug } },
      draft: true,
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    let doc: Page | undefined = docs[0]
    if (doc && !doc.createdBySeed) {
      payload.logger.info(
        `Já existe uma página em /${page.slug} que não é de teste: não foi mexida.`,
      )
    }
    if (!doc) {
      doc = await payload.create({
        collection: 'pages',
        data: {
          title: page.title,
          slug: page.slug,
          content: content(page.items({ ids, photo })),
          _status: page.status,
          createdBySeed: true,
        },
        draft: page.status === 'draft',
        overrideAccess: true,
      })
      payload.logger.info(`Página criada: /${page.slug}`)
    }
    ids[page.slug] = doc.id
  }

  const site = await payload.findGlobal({ slug: 'site', draft: true, overrideAccess: true })
  if (recreate || !site.name) {
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Café Grão Mineiro',
        tagline: SHORT,
        homepage: ids.inicio,
        colors: {
          primary: '#6b3f24',
          background: '#fffdf9',
          surface: '#f5ebe0',
          text: '#2a211b',
          footer: '#2a211b',
        },
        fonts: { headings: 'Lora', body: 'Figtree' },
        contact: {
          whatsapp: '(35) 99876-5432',
          phone: '(35) 3333-4521',
          email: 'contato@cafegraomineiro.com.br',
          address: 'Rua das Acácias, 120 · Centro · Pouso Alegre/MG',
          hours: 'Seg a sáb, das 7h às 19h',
        },
        social: { instagram: '@cafegraomineiro' },
        seoDescription: SHORT,
        _status: 'published',
      },
      overrideAccess: true,
    })
    payload.logger.info('Configurações do site gravadas.')
  }

  const header = await payload.findGlobal({ slug: 'header', draft: true, overrideAccess: true })
  // Só grava se o cabeçalho nunca foi salvo (um menu vazio publicado de propósito fica como está).
  if (recreate || !header.updatedAt) {
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: [
          { label: 'Início', link: pageLink(ids.inicio) },
          { label: 'Sobre nós', link: pageLink(ids.sobre) },
          { label: 'Nossos cafés', link: pageLink(ids['nossos-cafes']) },
          { label: 'Contato', link: pageLink(ids.contato) },
          // Página em rascunho: o item não pode aparecer no menu.
          { label: 'Novidades', link: pageLink(ids.novidades) },
        ],
        button: { label: 'Pedir pelo WhatsApp', link: { kind: 'whatsapp' } },
        _status: 'published',
      },
      overrideAccess: true,
    })
    payload.logger.info('Cabeçalho gravado.')
  }

  const footer = await payload.findGlobal({ slug: 'footer', draft: true, overrideAccess: true })
  if (recreate || !footer.updatedAt) {
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        text: SHORT,
        showMenu: true,
        showContact: true,
        showSocial: true,
        _status: 'published',
      },
      overrideAccess: true,
    })
    payload.logger.info('Rodapé gravado.')
  }
}
