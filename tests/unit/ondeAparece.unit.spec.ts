import { describe, expect, it } from 'vitest'

import {
  deviceLimitedSections,
  hiddenWhereLinkShows,
  linksToDeviceHidden,
  menuToDeviceHidden,
} from '@/puck/devices'
import { parsePageContent, type PuckPageData } from '@/puck/schema'

// "Onde aparece" (Elementor, E3): a primeira seção sempre aparece e o Publicar avisa os links.

const rt = (id: string, devices?: string, extra: Record<string, unknown> = {}) => ({
  type: 'RichText',
  props: {
    id,
    menuLabel: '',
    title: id,
    body: '<p>x</p>',
    style: 'light',
    anim: 'site',
    devices,
    ...extra,
  },
})
const cta = (id: string, sectionId: string, devices?: string) => ({
  type: 'CallToAction',
  props: {
    id,
    menuLabel: '',
    title: 'Chamada',
    text: '',
    style: 'brand',
    anim: 'site',
    devices,
    button: { label: 'Ir', link: { kind: 'section', pageId: 7, sectionId } },
  },
})

const page = (content: unknown[]) => {
  const parsed = parsePageContent({ version: 2, data: { root: { props: {} }, content } })
  if (!parsed.success) throw parsed.error
  return parsed.data.data as PuckPageData
}

describe('onde aparece', () => {
  it('páginas de antes continuam válidas, sem o campo', () => {
    const data = page([rt('a'), rt('b')])
    expect(data.content[1].props.devices).toBeUndefined()
  })

  it('a primeira seção volta a aparecer nos dois', () => {
    const data = page([rt('a', 'mobile'), rt('b', 'desktop')])
    expect(data.content[0].props.devices).toBe('all')
    expect(data.content[1].props.devices).toBe('desktop')
  })

  it('recusa valor desconhecido', () => {
    const parsed = parsePageContent({
      version: 2,
      data: { root: { props: {} }, content: [rt('a'), rt('b', 'tablet')] },
    })
    expect(parsed.success).toBe(false)
  })

  it('lista as seções que aparecem só num aparelho', () => {
    const data = page([rt('a'), rt('b', 'desktop'), rt('c'), rt('d', 'mobile')])
    expect(deviceLimitedSections(data)).toEqual([
      { id: 'b', type: 'RichText', devices: 'desktop' },
      { id: 'd', type: 'RichText', devices: 'mobile' },
    ])
  })

  it('em qual aparelho o destino some enquanto o link aparece', () => {
    expect(hiddenWhereLinkShows('all', 'desktop')).toBe('celular')
    expect(hiddenWhereLinkShows('all', 'mobile')).toBe('computador')
    expect(hiddenWhereLinkShows('mobile', 'mobile')).toBeNull()
    expect(hiddenWhereLinkShows('desktop', 'mobile')).toBe('computador')
    expect(hiddenWhereLinkShows(undefined, undefined)).toBeNull()
  })

  it('avisa o botão que leva para uma seção escondida onde ele aparece', () => {
    const data = page([
      rt('a'),
      cta('c1', 'b'),
      rt('b', 'desktop'),
      cta('c2', 'd', 'mobile'),
      rt('d', 'mobile'),
    ])
    expect(linksToDeviceHidden(data, 7)).toEqual([
      { sectionId: 'c1', sectionType: 'CallToAction', label: 'Ir', device: 'celular' },
    ])
    // Botão de outra página não conta aqui.
    expect(linksToDeviceHidden(data, 8)).toEqual([])
  })

  it('avisa o item do menu que leva para uma seção escondida num aparelho', () => {
    const data = page([rt('a'), rt('b', 'mobile')])
    const items = [
      { label: 'Encomendar', link: { kind: 'section', page: 7, section: 'b' } },
      { label: 'Início', link: { kind: 'page', page: 7 } },
      { label: 'Outra', link: { kind: 'section', page: { id: 9 }, section: 'b' } },
    ]
    expect(menuToDeviceHidden(data, 7, items)).toEqual([
      { label: 'Encomendar', device: 'computador' },
    ])
  })
})
