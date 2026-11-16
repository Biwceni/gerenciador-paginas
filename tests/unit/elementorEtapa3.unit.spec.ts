import { describe, expect, it } from 'vitest'

import { countText, parseCount } from '@/lib/countUp'
import {
  cleanSavedName,
  defaultSavedName,
  dropMissingReferences,
  readSaved,
  SAVED_NAME_MAX,
} from '@/puck/savedSections'
import { packSection, type SectionItem } from '@/puck/sectionClipboard'

// Etapa 3 das melhorias do Elementor: a contagem dos Números do negócio (E10) e as regras de
// Minhas seções (E2).

const hero = (extra: Record<string, unknown> = {}): SectionItem =>
  ({
    type: 'Hero',
    props: {
      id: 'Hero-1',
      menuLabel: '',
      title: 'Bolos por encomenda',
      text: 'Texto.',
      image: null,
      button: null,
      style: 'light',
      align: 'left',
      height: 'compact',
      highlight: '',
      anim: 'site',
      ...extra,
    },
  }) as unknown as SectionItem

describe('E10 contagem dos números', () => {
  it('acha o número e guarda o que vem antes e depois', () => {
    expect(parseCount('+500')).toMatchObject({ before: '+', after: '', value: 500 })
    expect(parseCount('4,9 ★')).toMatchObject({ value: 4.9, decimals: 1, after: ' ★' })
    expect(parseCount('+3.000')).toMatchObject({ value: 3000, grouped: true })
    expect(parseCount('24h')).toMatchObject({ value: 24, after: 'h' })
  })

  it('sem número para contar, não conta', () => {
    expect(parseCount('Desde sempre')).toBeNull()
    expect(parseCount('0')).toBeNull()
    expect(parseCount('')).toBeNull()
  })

  it('termina igual ao texto escrito e começa do zero', () => {
    for (const text of ['+500', '4,9', '+3.000', '24h', '10 anos']) {
      const target = parseCount(text)
      expect(target).not.toBeNull()
      expect(countText(target!, 1)).toBe(text)
    }
    expect(countText(parseCount('+3.000')!, 0)).toBe('+0')
    expect(countText(parseCount('4,9')!, 0)).toBe('0,0')
    expect(countText(parseCount('+3.000')!, 2)).toBe('+3.000')
  })
})

describe('E2 Minhas seções', () => {
  it('o nome já vem do tipo e do título, sem marcação e no tamanho máximo', () => {
    expect(defaultSavedName(hero(), 'Banner principal')).toBe(
      'Banner principal: Bolos por encomenda',
    )
    expect(defaultSavedName(hero({ title: '<b>Doces</b>   <i>finos</i>' }), 'Banner')).toBe(
      'Banner: Doces finos',
    )
    expect(defaultSavedName(hero({ title: '' }), 'Banner principal')).toBe('Banner principal')
    const long = defaultSavedName(hero({ title: 'palavra '.repeat(20) }), 'Banner')
    expect(long.length).toBeLessThanOrEqual(SAVED_NAME_MAX)
    expect(long.endsWith('…')).toBe(true)
  })

  it('o nome guardado fica limpo', () => {
    expect(cleanSavedName('  Banner    da   home  ')).toBe('Banner da home')
    expect(cleanSavedName('x'.repeat(100))).toHaveLength(SAVED_NAME_MAX)
    expect(cleanSavedName('    ')).toBe('')
  })

  it('tira foto, página e formulário que não existem mais', () => {
    const item = hero({
      image: { mediaId: 5 },
      button: { label: 'Ver', link: { kind: 'page', pageId: 9 } },
    })
    const none = { hasPhoto: () => false, hasPage: () => false, hasForm: () => false }
    const all = { hasPhoto: () => true, hasPage: () => true, hasForm: () => true }
    const cleaned = dropMissingReferences(item, none)
    expect(cleaned.props.image).toBeNull()
    expect((cleaned.props.button as { link: unknown }).link).toBeNull()
    expect(dropMissingReferences(item, all)).toEqual(item)
  })

  it('seção fora do formato vira "não pode mais ser usada", mas guarda o tipo', () => {
    const good = readSaved({
      id: 1,
      name: ' Meu banner ',
      section: JSON.parse(packSection(hero())),
    })
    expect(good).toMatchObject({ id: 1, name: 'Meu banner', type: 'Hero' })
    expect(good.item?.props.title).toBe('Bolos por encomenda')

    const bad = readSaved({
      id: 2,
      name: '',
      section: { kind: 'gp-section', version: 1, item: { type: 'Hero', props: { id: 3 } } },
    })
    expect(bad).toMatchObject({ name: 'Seção guardada', item: null, type: 'Hero' })
    expect(readSaved({ id: 3, section: null })).toMatchObject({ item: null, type: '' })
  })
})
