// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { contrastRatio, distinctSurface } from '@/lib/colors'
import { highlightRange, titleWords } from '@/lib/highlight'
import { tidyPastedHTML } from '@/lib/pasteHtml'
import { findPhotoPath } from '@/puck/photoPaths'
import { versionChanges } from '@/puck/versionDiff'

// Entrega 4 do editor: campos mais claros e desfazer com segurança.

describe('palavras em destaque tocando no título (achados 11.4 e 3.4)', () => {
  it('separa as palavras do título, sem a pontuação do fim', () => {
    expect(titleWords('Bolos feitos à mão.').map((word) => word.text)).toEqual([
      'Bolos',
      'feitos',
      'à',
      'mão',
    ])
  })
  it('diz quais palavras o destaque cobre, pela mesma regra do site', () => {
    expect(highlightRange('Bolos feitos à mão com carinho', 'à mão')).toEqual([2, 3])
    expect(highlightRange('Bolos feitos à mão', 'amor')).toBeNull()
    expect(highlightRange('Bolos feitos à mão', '')).toBeNull()
  })
})

describe('fundo Suave diferente do fundo do site (achado 3.2)', () => {
  it('num site escuro com as duas cores quase iguais, o Suave se afasta', () => {
    const surface = distinctSurface('#1a1a1a', '#141414', '#f5f5f5')
    expect(surface).not.toBe('#1a1a1a')
    expect(contrastRatio(surface, '#141414')).toBeGreaterThanOrEqual(1.1)
  })
  it('as cores padrão ficam como estão', () => {
    expect(distinctSurface('#f3f4f6', '#ffffff', '#111827')).toBe('#f3f4f6')
  })
})

describe('colar do Word no Texto simples (achado 7.4)', () => {
  it('cada linha da tabela vira um parágrafo, com as células separadas', () => {
    expect(
      tidyPastedHTML('<table><tr><td>Bolo</td><td>R$ 45</td></tr><tr><td>Torta</td></tr></table>'),
    ).toBe('<p>Bolo · R$ 45</p><p>Torta</p>')
  })
  it('títulos colados viram o subtítulo do site', () => {
    expect(tidyPastedHTML('<h1>Cardápio</h1><p>Texto</p>')).toBe('<h3>Cardápio</h3><p>Texto</p>')
  })
  it('texto sem tabela nem título passa como veio', () => {
    expect(tidyPastedHTML('<p>Oi <b>você</b></p>')).toBe('<p>Oi <b>você</b></p>')
  })
})

describe('trocar a foto tocando nela na prévia', () => {
  it('acha o campo da foto nas opções da seção', () => {
    expect(findPhotoPath({ image: { mediaId: 3 } }, 3)).toBe('image')
    expect(findPhotoPath({ items: [{ image: null }, { image: { mediaId: 7 } }] }, 7)).toBe(
      'items[1].image',
    )
    expect(findPhotoPath({ images: [{ mediaId: 1 }, { mediaId: 9, caption: '' }] }, 9)).toBe(
      'images[1]',
    )
  })
  it('foto de uma peça das Colunas não é da seção', () => {
    expect(
      findPhotoPath({ column1: [{ type: 'ColumnImage', props: { image: { mediaId: 4 } } }] }, 4),
    ).toBeNull()
  })
})

describe('o que mudou em cada versão (achado 10.5)', () => {
  const hero = (title: string) => ({ type: 'Hero', props: { id: 'h', title } })
  const faq = { type: 'Faq', props: { id: 'f' } }
  it('diz o que entrou, saiu e mudou', () => {
    expect(versionChanges({ content: [hero('Novo'), faq] }, { content: [hero('Velho')] })).toBe(
      'Entrou: Perguntas frequentes. Mudou: Banner principal.',
    )
    expect(versionChanges({ content: [hero('A')] }, { content: [hero('A'), faq] })).toBe(
      'Saiu: Perguntas frequentes.',
    )
  })
  it('a primeira versão e a ordem trocada', () => {
    expect(versionChanges({ content: [hero('A')] }, null)).toBe('Primeira versão publicada.')
    expect(versionChanges({ content: [faq, hero('A')] }, { content: [hero('A'), faq] })).toBe(
      'A ordem das seções mudou.',
    )
  })
})
