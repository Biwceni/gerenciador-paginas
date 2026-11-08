import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { fillPhotoSlots, illustrationURL } from '@/lib/illustration'
import { parsePageContent, type PuckPageData } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

// Redesign v3, entrega 6: ilustração no lugar das fotos nas prévias dos modelos e a fonte dos
// títulos só nos títulos grandes.

const homeOf = (key: string): PuckPageData => {
  const parsed = parsePageContent(templateSeeds.find((seed) => seed.key === key)!.pages![0].content)
  if (!parsed.success) throw new Error('modelo inválido')
  return parsed.data.data
}

describe('ilustração no lugar das fotos', () => {
  it('é um desenho nas cores do site, que muda um pouco a cada foto', () => {
    const colors = { primary: '#b8476e', surface: '#fbeef2' }
    const first = decodeURIComponent(illustrationURL(colors, 0))
    expect(first.startsWith('data:image/svg+xml')).toBe(true)
    expect(first).toContain('#fbeef2')
    expect(illustrationURL(colors, 1)).not.toBe(illustrationURL(colors, 0))
  })

  it('cor inválida cai na cor padrão, sem ir parar no desenho', () => {
    const url = decodeURIComponent(illustrationURL({ primary: 'red"/><script>', surface: null }))
    expect(url).not.toContain('<script>')
  })

  it('preenche os lugares de foto da vitrine, do banner e da galeria', () => {
    const data = homeOf('confeitaria-aconchego')
    const { data: filled, count } = fillPhotoSlots(data)
    const hero = filled.content.find((item) => item.type === 'Hero')!
    const products = filled.content.find((item) => item.type === 'Products')!
    const text = filled.content.find((item) => item.type === 'TextImage')!
    expect(hero.props).toMatchObject({ image: { mediaId: 1 } })
    if (products.type !== 'Products') throw new Error('esperava a vitrine')
    expect(products.props.items.every((item) => item.image)).toBe(true)
    expect(text.props).toMatchObject({ image: { mediaId: expect.any(Number) } })
    // Banner, 3 produtos e o texto com foto.
    expect(count).toBe(5)
    // O conteúdo do modelo não muda.
    expect(data.content.find((item) => item.type === 'Hero')!.props).toMatchObject({ image: null })
  })

  it('a galeria vazia ganha 6 fotos; o banner sem foto (fundo suave) não ganha', () => {
    const { data, count } = fillPhotoSlots(homeOf('beleza-editorial'))
    const gallery = data.content.find((item) => item.type === 'Gallery')!
    if (gallery.type !== 'Gallery') throw new Error('esperava a galeria')
    expect(gallery.props.images).toHaveLength(6)
    expect(count).toBe(7)
    const office = fillPhotoSlots(homeOf('escritorio-editorial'))
    expect(office.data.content[0].props).toMatchObject({ style: 'soft', image: null })
  })
})

describe('fonte dos títulos', () => {
  const css = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

  it('só nos títulos grandes; os pequenos usam a fonte do texto em negrito', () => {
    expect(css).toMatch(/& h1,\s*& h2 \{\s*font-family: var\(--font-headings\);/)
    expect(css).toMatch(/& h3 \{\s*font-family: var\(--font-body\);\s*font-weight: 700;/)
  })

  it('depoimentos e números do passo a passo também ficam na fonte do texto', () => {
    expect(css).toMatch(/\.testimonials blockquote \{[^}]*font-family: var\(--font-body\)/)
    expect(css).toMatch(/\.features__number \{[^}]*font-family: var\(--font-body\)/)
  })
})
