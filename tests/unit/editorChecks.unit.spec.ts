import { describe, expect, it } from 'vitest'

import { isStaleVersion } from '@/lib/editor'
import { pagePhotoIds, usesWhatsApp } from '@/puck/references'
import type { PageComponent, PuckPageData } from '@/puck/schema'
import { googleTitle, homeGoogleTitle } from '@/puck/seo'
import { pageBuilder, whatsapp } from '@/seed/templates/sections'

describe('isStaleVersion', () => {
  const base = '2026-10-31T12:00:00.000Z'

  it('só é conflito quando a versão mais recente é mais nova', () => {
    expect(isStaleVersion(base, '2026-10-31T12:00:00.001Z')).toBe(true)
    expect(isStaleVersion(base, base)).toBe(false)
    expect(isStaleVersion(base, '2026-10-31T11:59:59.999Z')).toBe(false)
  })

  it('data que não dá para ler não vira conflito', () => {
    expect(isStaleVersion('qualquer coisa', base)).toBe(false)
    expect(isStaleVersion(base, null)).toBe(false)
  })
})

describe('título do Google', () => {
  const page = { title: 'Sobre' }
  const site = { name: 'Café Mineiro', tagline: 'Café especial. Torrado toda semana.' }
  const noTagline = { name: 'Café Mineiro', tagline: null }

  it('página inicial com frase: nome e primeira frase', () => {
    expect(googleTitle(page, site, true)).toBe('Café Mineiro | Café especial')
  })

  it('página inicial sem frase: só o nome, sem barra no fim', () => {
    expect(googleTitle(page, noTagline, true)).toBe('Café Mineiro')
    expect(homeGoogleTitle({ name: 'Café Mineiro', tagline: '  ' })).toBe('Café Mineiro')
  })

  it('página inicial com título próprio usa ele sozinho', () => {
    expect(googleTitle({ ...page, seoTitle: 'Café em BH' }, site, true)).toBe('Café em BH')
  })

  it('página comum: nome da página e nome do site, com ou sem frase', () => {
    expect(googleTitle(page, site, false)).toBe('Sobre | Café Mineiro')
    expect(googleTitle(page, noTagline, false)).toBe('Sobre | Café Mineiro')
  })

  it('página comum com título próprio', () => {
    expect(googleTitle({ ...page, seoTitle: 'Nossa história' }, site, false)).toBe(
      'Nossa história | Café Mineiro',
    )
  })

  it('título próprio em branco conta como automático', () => {
    expect(googleTitle({ ...page, seoTitle: '' }, site, false)).toBe('Sobre | Café Mineiro')
  })
})

describe('fotos da página', () => {
  const data: PuckPageData = {
    root: { props: {} },
    content: [pageBuilder().hero({ image: 3 })],
  }

  it('junta as das seções com a do Google, sem repetir', () => {
    expect(pagePhotoIds(data, null)).toEqual([3])
    expect(pagePhotoIds(data, 8)).toEqual([3, 8])
    expect(pagePhotoIds(data, { id: 8 })).toEqual([3, 8])
    expect(pagePhotoIds(data, 3)).toEqual([3])
  })

  it('conteúdo que não deu para ler ainda conta a foto do Google', () => {
    expect(pagePhotoIds(null, 8)).toEqual([8])
  })
})

describe('botão de WhatsApp na página', () => {
  const page = (content: PageComponent[]): PuckPageData => ({ root: { props: {} }, content })

  it('acha o botão de uma seção', () => {
    expect(usesWhatsApp(page([pageBuilder().cta({ button: 'Pedir', link: whatsapp })]))).toBe(true)
  })

  it('botão para outra página não conta', () => {
    const link = { kind: 'page', pageId: 1 } as const
    expect(usesWhatsApp(page([pageBuilder().cta({ button: 'Pedir', link })]))).toBe(false)
  })

  it('botão sem texto não aparece no site e não conta', () => {
    expect(usesWhatsApp(page([pageBuilder().cta({ button: ' ', link: whatsapp })]))).toBe(false)
  })

  it('acha o botão dentro das colunas', () => {
    const columns: PageComponent = {
      type: 'Columns',
      props: {
        id: 'Columns-1',
        menuLabel: '',
        layout: 'half',
        column1: [
          {
            type: 'ColumnButton',
            props: { id: 'c1', button: { label: 'Falar', link: whatsapp } },
          },
        ],
        column2: [],
        column3: [],
        style: 'light',
      },
    }
    expect(usesWhatsApp(page([columns]))).toBe(true)
  })
})
