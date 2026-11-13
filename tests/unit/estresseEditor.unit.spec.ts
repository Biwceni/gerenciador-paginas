import { describe, expect, it } from 'vitest'

import { sectionChecks } from '@/puck/checks'
import { CONTENT_VERSION, parsePageContent } from '@/puck/schema'

// Achados do teste de estresse do editor (rodada 13) que dá para conferir sem abrir a tela.
// `it.fails` marca o que ainda está errado: o teste passa enquanto o bug existe e começa a falhar
// quando a correção chega. Quem corrigir troca `it.fails` por `it`.

const page = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

const hero = {
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title: 'Teste',
    text: 'Texto.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
}

/** Um parágrafo com negrito e itálico: 54 letras que a pessoa vê, 113 com as marcações. */
const PARAGRAPH =
  '<p><strong>Bolo</strong> de <em>chocolate</em> com recheio de <strong>brigadeiro</strong> e <em>morango</em>.</p>'

const richText = (paragraphs: number) => ({
  type: 'RichText',
  props: {
    id: 'RichText-r1',
    menuLabel: '',
    title: 'Cardápio completo',
    body: PARAGRAPH.repeat(paragraphs),
    style: 'light',
    anim: 'site',
  },
})

const visibleLetters = (html: string) => html.replace(/<[^>]+>/g, '').length

describe('13.3 Texto simples: o limite conta as letras que a pessoa vê', () => {
  it('aceita cerca de 9.700 letras com negrito e itálico', () => {
    const section = richText(180)
    expect(visibleLetters(section.props.body)).toBeLessThan(10_000)
    expect(section.props.body.length).toBeGreaterThan(20_000)
    expect(parsePageContent(page([hero, section])).success).toBe(true)
  })

  it('recusa um texto com mais letras visíveis do que o limite', () => {
    const section = richText(400)
    expect(visibleLetters(section.props.body)).toBeGreaterThan(20_000)
    expect(parsePageContent(page([hero, section])).success).toBe(false)
  })
})

describe('13.8 Nome no menu só com emoji', () => {
  it.fails('é recusado, porque não vira endereço da seção', () => {
    const section = richText(1)
    section.props.menuLabel = '⭐⭐'
    expect(parsePageContent(page([hero, section])).success).toBe(false)
  })
})

describe('13.2 Seções que não vão aparecer no site', () => {
  const empty = [
    hero,
    {
      type: 'Video',
      props: {
        id: 'Video-v1',
        menuLabel: '',
        title: 'Nosso vídeo',
        videoId: '',
        caption: '',
        cover: null,
        style: 'light',
        anim: 'site',
      },
    },
    {
      type: 'Gallery',
      props: {
        id: 'Gallery-g1',
        menuLabel: '',
        title: 'Nossas fotos',
        images: [],
        layout: 'grid',
        showCaptions: false,
        style: 'soft',
        anim: 'site',
      },
    },
    {
      type: 'Form',
      props: {
        id: 'Form-f1',
        menuLabel: '',
        title: 'Fale com a gente',
        text: 'Mande sua mensagem.',
        form: null,
        successMessage: 'Obrigado!',
        style: 'light',
        anim: 'site',
      },
    },
    {
      type: 'InstagramStrip',
      props: {
        id: 'InstagramStrip-i1',
        menuLabel: '',
        title: 'Siga a gente',
        images: [],
        style: 'light',
        anim: 'site',
      },
    },
    {
      type: 'Columns',
      props: {
        id: 'Columns-c9',
        menuLabel: '',
        layout: 'half',
        column1: [],
        column2: [],
        column3: [],
        style: 'light',
        anim: 'site',
      },
    },
  ]

  it('a página de teste é válida', () => {
    expect(parsePageContent(page(empty)).success).toBe(true)
  })

  it.fails('o Publicar avisa cada uma, pelo nome da seção', () => {
    const parsed = parsePageContent(page(empty))
    if (!parsed.success) throw new Error('página inválida')
    const words = sectionChecks(parsed.data.data, { hasPhoto: () => true, instagram: '@loja' })
      .map((check) => `${check.title} ${check.text}`)
      .join(' ')
    for (const name of ['Vídeo', 'Galeria', 'Formulário', 'Instagram', 'Colunas']) {
      expect(words).toContain(name)
    }
  })
})
