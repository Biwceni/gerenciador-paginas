import { describe, expect, it } from 'vitest'

import { collectReferences, type ContentMetadata, getHref } from '@/puck/references'
import { CONTENT_VERSION, emptyPageContent, parsePageContent } from '@/puck/schema'
import { extractDescription, firstPhotoId, firstSentence } from '@/puck/seo'

const hero = {
  type: 'Hero',
  props: {
    id: 'hero-1',
    title: 'Título',
    text: 'Frase do banner',
    image: { mediaId: 7 },
    button: { label: 'Ver', link: { kind: 'page', pageId: 3 } },
    style: 'image',
    align: 'left',
  },
}

// Conteúdo na versão 1 (antes do "Nome no menu"): todos os testes passam pela migração.
const valid = {
  version: 1,
  data: {
    root: { props: {} },
    content: [
      hero,
      {
        type: 'Gallery',
        props: {
          id: 'gal-1',
          title: 'Fotos',
          images: [{ mediaId: 8 }, { mediaId: 7 }],
          style: 'light',
        },
      },
      {
        type: 'CallToAction',
        props: {
          id: 'cta-1',
          title: 'Fale',
          text: '',
          button: { label: 'Ir', link: { kind: 'whatsapp' } },
          style: 'brand',
        },
      },
      {
        type: 'TextImage',
        props: {
          id: 'ti-1',
          title: 'Sobre',
          text: 'Texto',
          image: null,
          side: 'left',
          style: 'soft',
        },
      },
    ],
  },
}

const withHero = (props: Record<string, unknown>) => ({
  ...valid,
  data: { ...valid.data, content: [{ ...hero, props: { ...hero.props, ...props } }] },
})

describe('parsePageContent', () => {
  it('aceita conteúdo válido e vazio', () => {
    expect(parsePageContent(valid).success).toBe(true)
    expect(parsePageContent(emptyPageContent()).success).toBe(true)
    expect(parsePageContent(null).success).toBe(true)
  })

  it('descarta campos desconhecidos', () => {
    const result = parsePageContent(withHero({ extra: 'x' }))
    expect(result.success && 'extra' in result.data.data.content[0].props).toBe(false)
  })

  it('recusa seção desconhecida, versão errada, estilo inventado e link perigoso', () => {
    expect(
      parsePageContent({
        ...valid,
        data: { ...valid.data, content: [{ type: 'Script', props: { id: 'x' } }] },
      }).success,
    ).toBe(false)
    expect(parsePageContent({ ...valid, version: 999 }).success).toBe(false)
    // Versão nova sem o campo que a migração colocaria.
    expect(parsePageContent({ ...valid, version: CONTENT_VERSION }).success).toBe(false)
    expect(parsePageContent(withHero({ style: 'neon' })).success).toBe(false)
    expect(
      parsePageContent(
        withHero({ button: { label: 'x', link: { kind: 'url', url: 'javascript:alert(1)' } } }),
      ).success,
    ).toBe(false)
  })

  it('recusa foto guardada como endereço em vez de relação', () => {
    expect(parsePageContent(withHero({ image: 'https://x/foto.jpg' })).success).toBe(false)
  })
})

describe('referências', () => {
  const data = parsePageContent(valid)
  if (!data.success) throw new Error('conteúdo de teste inválido')

  it('junta fotos e páginas citadas, sem repetir', () => {
    expect(collectReferences(data.data.data)).toEqual({
      mediaIds: [7, 8],
      pageIds: [3],
      sectionPageIds: [],
    })
  })

  it('link para página fora do ar ou WhatsApp sem número não tem endereço', () => {
    const metadata: ContentMetadata = {
      photos: {},
      pageHrefs: { 3: '/servicos' },
      pageAnchors: { 3: { 'faq-1': 'perguntas' } },
      anchors: {},
      whatsappHref: null,
      site: { name: 'Café', logo: null, contact: {} },
    }
    expect(getHref(metadata, { kind: 'page', pageId: 3 })).toBe('/servicos')
    expect(getHref(metadata, { kind: 'page', pageId: 4 })).toBeNull()
    expect(getHref(metadata, { kind: 'whatsapp' })).toBeNull()
    expect(getHref({ ...metadata, whatsappHref: 'https://wa.me/55' }, { kind: 'whatsapp' })).toBe(
      'https://wa.me/55',
    )
    expect(getHref(metadata, null)).toBeNull()
    expect(getHref(metadata, { kind: 'section', pageId: 3, sectionId: 'faq-1' })).toBe(
      '/servicos#perguntas',
    )
    // Seção que saiu da página leva para a página; página fora do ar, para lugar nenhum.
    expect(getHref(metadata, { kind: 'section', pageId: 3, sectionId: 'x' })).toBe('/servicos')
    expect(getHref(metadata, { kind: 'section', pageId: 4, sectionId: 'faq-1' })).toBeNull()
  })

  it('tira descrição e foto para o Google e o compartilhamento', () => {
    expect(extractDescription(data.data.data)).toBe('Frase do banner')
    expect(firstPhotoId(data.data.data)).toBe(7)
  })

  it('pega a primeira frase da apresentação', () => {
    expect(firstSentence('Café especial. Torrado toda semana.')).toBe('Café especial')
    expect(firstSentence('Sem ponto final')).toBe('Sem ponto final')
    expect(firstSentence(null)).toBe('')
  })
})
