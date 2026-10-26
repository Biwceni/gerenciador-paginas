import { describe, expect, it } from 'vitest'

import { richTextToPlain, sanitizeRichText } from '@/lib/richtext'
import { youtubeID } from '@/lib/youtube'
import { sectionAnchors } from '@/puck/anchors'
import { collectReferences } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent } from '@/puck/schema'
import { extractDescription, firstPhotoId } from '@/puck/seo'

const parse = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { root: { props: {} }, content } })

const faq = {
  type: 'Faq',
  props: {
    id: 'faq-1',
    menuLabel: 'Perguntas',
    title: 'Dúvidas',
    items: [{ question: 'Abre sábado?', answer: 'Sim, das 8h às 12h.' }],
    style: 'light',
  },
}

const columns = (column1: unknown[]) => ({
  type: 'Columns',
  props: {
    id: 'col-1',
    menuLabel: '',
    layout: 'half',
    column1,
    column2: [],
    column3: [],
    style: 'light',
  },
})

const video = (videoId: string) => ({
  type: 'Video',
  props: {
    id: 'v',
    menuLabel: '',
    title: '',
    videoId,
    caption: '',
    cover: { mediaId: 4 },
    style: 'light',
  },
})

describe('seções da fase 2', () => {
  it('migra a versão 1 colocando o "Nome no menu" vazio, menos no banner', () => {
    const result = parsePageContent({
      version: 1,
      data: {
        content: [
          {
            type: 'Hero',
            props: {
              id: 'h',
              title: '',
              text: '',
              image: null,
              button: null,
              style: 'brand',
              align: 'left',
            },
          },
          {
            type: 'CallToAction',
            props: { id: 'c', title: '', text: '', button: null, style: 'brand' },
          },
        ],
      },
    })
    expect(result.success && result.data.version).toBe(CONTENT_VERSION)
    const props = result.success ? result.data.data.content.map((item) => item.props) : []
    expect(props.map((item) => 'menuLabel' in item)).toEqual([false, true])
  })

  it('aceita as seções novas e recusa lista vazia ou longa demais', () => {
    expect(parse([faq]).success).toBe(true)
    expect(parse([{ ...faq, props: { ...faq.props, items: [] } }]).success).toBe(false)
    const many = Array.from({ length: 13 }, () => faq.props.items[0])
    expect(parse([{ ...faq, props: { ...faq.props, items: many } }]).success).toBe(false)
  })

  it('colunas aceitam só as peças pequenas, e as peças não ficam soltas na página', () => {
    const piece = { type: 'ColumnText', props: { id: 'p-1', title: 'A', text: 'B' } }
    expect(parse([columns([piece])]).success).toBe(true)
    expect(parse([columns([faq])]).success).toBe(false)
    expect(parse([piece]).success).toBe(false)
  })

  it('vídeo guarda só o código do YouTube', () => {
    expect(parse([video('dQw4w9WgXcQ')]).success).toBe(true)
    expect(parse([video('')]).success).toBe(true)
    expect(parse([video('https://youtu.be/dQw4w9WgXcQ')]).success).toBe(false)
  })

  it('limpa o HTML do texto simples ao ler', () => {
    const result = parse([
      {
        type: 'RichText',
        props: {
          id: 'rt',
          menuLabel: '',
          title: '',
          body: '<p onclick="x()">Oi <script>alert(1)</script><a href="javascript:alert(1)">aqui</a></p>',
          style: 'light',
        },
      },
    ])
    const item = result.success ? result.data.data.content[0] : null
    expect(item?.type === 'RichText' && item.props.body).toBe('<p>Oi aqui</p>')
  })

  it('junta as páginas citadas por links para seção', () => {
    const result = parse([
      {
        type: 'CallToAction',
        props: {
          id: 'cta',
          menuLabel: '',
          title: '',
          text: '',
          button: { label: 'Dúvidas', link: { kind: 'section', pageId: 5, sectionId: 'faq-1' } },
          style: 'brand',
        },
      },
    ])
    expect(result.success && collectReferences(result.data.data)).toEqual({
      mediaIds: [],
      pageIds: [5],
      sectionPageIds: [5],
    })
  })

  it('descrição e foto do Google também vêm das seções novas', () => {
    const result = parse([video('dQw4w9WgXcQ'), faq])
    expect(result.success && extractDescription(result.data.data)).toBe('Sim, das 8h às 12h.')
    expect(result.success && firstPhotoId(result.data.data)).toBe(4)
  })
})

describe('âncoras das seções', () => {
  const item = (id: string, menuLabel: string) => ({
    type: 'Contact' as const,
    props: { id, menuLabel, title: '', text: '', style: 'light' as const },
  })

  it('vêm do nome no menu, sem acento, e nomes repetidos ganham número', () => {
    expect(
      sectionAnchors({
        content: [item('a', 'Serviços'), item('b', ''), item('c', 'serviços'), item('d', 'Fale')],
      }),
    ).toEqual({ a: 'servicos', c: 'servicos-2', d: 'fale' })
  })
})

describe('texto simples (HTML)', () => {
  it('mantém só as marcações da lista e links seguros', () => {
    expect(sanitizeRichText('<h1>T</h1><h3>Sub</h3><img src=x onerror=alert(1)>')).toBe(
      'T<h3>Sub</h3>',
    )
    expect(sanitizeRichText('<ul><li><strong>a</strong></li></ul>')).toBe(
      '<ul><li><strong>a</strong></li></ul>',
    )
    expect(sanitizeRichText('<a href="/contato" target="_top" style="x">c</a>')).toBe(
      '<a href="/contato">c</a>',
    )
    expect(sanitizeRichText('<a href="https://x.com">x</a>')).toBe(
      '<a href="https://x.com" target="_blank" rel="noopener noreferrer">x</a>',
    )
  })

  it('recusa links que levam para fora disfarçados de página do site', () => {
    expect(sanitizeRichText('<a href="//mal.com">a</a>')).toBe('a')
    expect(sanitizeRichText('<a href="/\\mal.com">a</a>')).toBe('a')
    expect(sanitizeRichText('<a href="data:text/html,x">a</a>')).toBe('a')
  })

  it('vira texto corrido para a descrição do Google', () => {
    expect(richTextToPlain('<p>Olá &amp; bem-vindo</p><ul><li>um</li><li>dois</li></ul>')).toBe(
      'Olá & bem-vindo um dois',
    )
  })
})

describe('endereço do YouTube', () => {
  it('tira o código do vídeo dos formatos comuns', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://m.youtube.com/embed/dQw4w9WgXcQ',
      'dQw4w9WgXcQ',
    ]) {
      expect(youtubeID(url)).toBe('dQw4w9WgXcQ')
    }
  })

  it('recusa outros sites e endereços sem vídeo', () => {
    expect(youtubeID('https://vimeo.com/123')).toBeNull()
    expect(youtubeID('https://youtube.com.mal.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(youtubeID('https://www.youtube.com/@canal')).toBeNull()
    expect(youtubeID('')).toBeNull()
  })
})
