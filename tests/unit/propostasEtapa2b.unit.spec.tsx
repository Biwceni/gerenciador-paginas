import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { linksTo } from '@/components/editor/menu'
import { toFooterData } from '@/components/panel/footerData'
import { toSettingsState, toSiteData, validateSettings } from '@/components/panel/settings'
import {
  type FooterContact,
  type MenuItem,
  SiteFooterView,
  SiteHeaderView,
} from '@/components/site/SiteChrome'
import { hasTopBar, SiteTopBarView } from '@/components/site/SiteTopBarView'
import { headerPageIds, headerWithoutPage } from '@/hooks/protectPage'
import { contrastRatio } from '@/lib/colors'
import { companyLine, formatCNPJ, isValidCNPJ, validateCNPJ } from '@/lib/company'
import { flatMenu, isGroup, MENU_GROUP_LIMIT, MENU_LIMIT } from '@/lib/menu'
import type { Header } from '@/payload-types'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 2b: M1 (grupos, colunas do
// rodapé, linha de cima) e D3 (dados da empresa no rodapé).

const siteCss = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const none: FooterContact = {
  whatsapp: null,
  whatsappHref: null,
  phone: null,
  phoneHref: null,
  email: null,
  address: null,
  hours: null,
}

const page = (id: number) => ({ kind: 'page' as const, page: id })
type Items = NonNullable<Header['items']>

const label30 = (n: number) => `Um nome de link bem comprido ${n}`.slice(0, 30)

/** 8 grupos com 8 links de 30 letras: o maior menu que o painel aceita. */
const bigMenu: MenuItem[] = Array.from({ length: MENU_LIMIT }, (_, g) => ({
  id: `g${g}`,
  label: label30(g),
  href: '',
  current: false,
  children: Array.from({ length: MENU_GROUP_LIMIT }, (_, c) => ({
    id: `g${g}-${c}`,
    label: label30(g * 8 + c),
    href: `/p${g * 8 + c}`,
    current: g === 2 && c === 3,
  })),
}))

const header = (props: Partial<React.ComponentProps<typeof SiteHeaderView>> = {}) =>
  renderToStaticMarkup(
    <SiteHeaderView button={null} items={[]} logo={null} name="Loja" {...props} />,
  )

const footer = (props: Partial<React.ComponentProps<typeof SiteFooterView>> = {}) =>
  renderToStaticMarkup(
    <SiteFooterView
      contact={none}
      menu={[]}
      name="Loja"
      showContact={false}
      social={[]}
      text={null}
      {...props}
    />,
  )

describe('D3: CNPJ', () => {
  it('aceita CNPJ com os dígitos certos, com ou sem pontos', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true)
    expect(isValidCNPJ('11222333000181')).toBe(true)
  })

  it('recusa dígito errado, tamanho errado e números todos iguais', () => {
    expect(isValidCNPJ('11.222.333/0001-80')).toBe(false)
    expect(isValidCNPJ('1122233300018')).toBe(false)
    expect(isValidCNPJ('11111111111111')).toBe(false)
  })

  it('vazio pode; inválido explica em linguagem simples', () => {
    expect(validateCNPJ('')).toBe(true)
    expect(validateCNPJ(null)).toBe(true)
    expect(validateCNPJ('123')).toMatch(/Confira o CNPJ/)
  })

  it('formata com pontos e barra só quando tem 14 números', () => {
    expect(formatCNPJ('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatCNPJ(' 123 ')).toBe('123')
  })
})

describe('D3: linha da empresa no rodapé', () => {
  it('junta razão social, CNPJ e responsável técnico, na ordem', () => {
    expect(
      companyLine({
        legalName: 'Loja Ltda.',
        cnpj: '11222333000181',
        responsible: 'Dra. Ana, CRO 1',
      }),
    ).toEqual(['Loja Ltda.', 'CNPJ 11.222.333/0001-81', 'Responsável técnico: Dra. Ana, CRO 1'])
  })

  it('deixa de fora o vazio e o CNPJ inválido', () => {
    expect(companyLine({ legalName: ' ', cnpj: '123', responsible: null })).toEqual([])
    expect(companyLine(null)).toEqual([])
  })

  it('o rodapé mostra a linha só quando há dados', () => {
    const html = footer({ company: ['Loja Ltda.', 'CNPJ 11.222.333/0001-81'] })
    expect(html).toContain('site-footer__company')
    expect(html).toContain('<span>Loja Ltda.</span><span> · CNPJ 11.222.333/0001-81</span>')
    expect(footer({ text: 'Oi' })).not.toContain('site-footer__company')
  })

  it('a linha usa a cor do texto do rodapé, sem transparência', () => {
    const rule = siteCss.match(/\.site-footer__company\s*\{[^}]*\}/g)?.join('\n') ?? ''
    expect(rule).toContain('var(--color-on-footer)')
    expect(rule).not.toMatch(/opacity:\s*0\./)
    // A cor do texto do rodapé é escolhida para ler sobre o fundo: branco no marrom passa 4,5:1.
    expect(contrastRatio('#ffffff', '#2a211b')).toBeGreaterThanOrEqual(4.5)
  })

  it('Configurações guarda o CNPJ formatado e recusa o inválido', () => {
    const state = toSettingsState({ name: 'Loja' })
    expect(state.company).toEqual({ legalName: '', cnpj: '', responsible: '' })
    const filled = {
      ...state,
      company: { legalName: 'Loja Ltda.', cnpj: '11222333000181', responsible: '' },
    }
    expect(validateSettings(filled).cnpj).toBeUndefined()
    expect(toSiteData(filled).company).toEqual({
      legalName: 'Loja Ltda.',
      cnpj: '11.222.333/0001-81',
      responsible: null,
    })
    const wrong = { ...state, company: { ...filled.company, cnpj: '11.222.333/0001-80' } }
    expect(validateSettings(wrong).cnpj).toMatch(/Confira o CNPJ/)
  })
})

describe('M1: grupos no menu', () => {
  it('flatMenu e isGroup veem os links de dentro', () => {
    const items = [
      { label: 'Início', link: page(1), children: [] },
      { label: 'Serviços', link: null, children: [{ label: 'A', link: page(2) }] },
    ] as unknown as Items
    expect(flatMenu(items).map((item) => item.label)).toEqual(['Início', 'Serviços', 'A'])
    expect(items.map(isGroup)).toEqual([false, true])
  })

  it('o topo mostra o grupo como botão que abre a lista, com aria-expanded e aria-controls', () => {
    const html = header({ items: bigMenu })
    expect(html.match(/class="site-header__groupbtn"/g)?.length).toBe(MENU_LIMIT)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toMatch(/aria-controls="[^"]+"/)
    // Fechada: a lista existe, mas escondida.
    expect(html).toMatch(/<ul class="site-header__sub" hidden=""/)
    // O link da página atual marca o grupo também.
    expect(html).toContain('data-current=""')
    expect(html).toContain('aria-current="page"')
  })

  it('o rodapé repete os links de dentro dos grupos, sem repetir o mesmo endereço', () => {
    const menu: MenuItem[] = [
      { id: 'a', label: 'Início', href: '/', current: false },
      {
        id: 'g',
        label: 'Serviços',
        href: '',
        current: false,
        children: [
          { id: 'c1', label: 'Corte', href: '/corte', current: false },
          { id: 'c2', label: 'Início de novo', href: '/', current: false },
        ],
      },
    ]
    const html = footer({ menu })
    expect(html).toContain('>Corte<')
    expect(html).not.toContain('>Serviços<')
    expect(html).not.toContain('Início de novo')
  })

  it('o menu do editor reconhece a página dentro de um grupo', () => {
    const child = { label: 'A', link: { kind: 'page', page: 7 } } as Items[number]
    expect(linksTo(7)(child)).toBe(true)
    expect(linksTo(8)(child)).toBe(false)
  })
})

describe('M1: arquivar tira a página dos grupos também', () => {
  const base = {
    notice: null,
    topBar: { phone: true, hours: false, linkLabel: 'Orçamento', link: page(3) },
    button: { label: 'Fale', link: page(9) },
    items: [
      { id: '1', label: 'Início', link: page(1), children: [] },
      {
        id: '2',
        label: 'Serviços',
        link: { kind: 'page', page: null },
        children: [
          { id: '2a', label: 'A', link: page(2) },
          { id: '2b', label: 'B', link: page(3) },
        ],
      },
      {
        id: '3',
        label: 'Só um',
        link: { kind: 'page', page: null },
        children: [{ id: '3a', label: 'C', link: page(4) }],
      },
    ],
  } as unknown as Pick<Header, 'notice' | 'topBar' | 'items' | 'button'>

  it('headerPageIds lista as páginas de dentro dos grupos', () => {
    expect(headerPageIds(base)).toEqual([1, 2, 3, 4, 9])
  })

  it('tira o link de dentro e mantém o grupo com o resto', () => {
    const next = headerWithoutPage(base, 2)
    expect(next?.items?.[1]?.children?.map((child) => child.label)).toEqual(['B'])
  })

  it('o grupo que fica vazio sai do menu', () => {
    const next = headerWithoutPage(base, 4)
    expect(next?.items?.map((item) => item.label)).toEqual(['Início', 'Serviços'])
  })

  it('o link curto da linha de cima que levava para a página fica sem destino', () => {
    const next = headerWithoutPage(base, 3)
    expect(next?.topBar?.linkLabel).toBeNull()
    expect(next?.topBar?.phone).toBe(true)
  })

  it('página que não está no menu não muda nada', () => {
    expect(headerWithoutPage(base, 99)).toBeNull()
  })
})

describe('M1: colunas de links no rodapé', () => {
  const columns = Array.from({ length: 4 }, (_, c) => ({
    id: `c${c}`,
    title: `Coluna ${c + 1}`,
    links: Array.from({ length: 8 }, (_, l) => ({
      id: `c${c}-${l}`,
      label: label30(l),
      href: `/x${l}`,
      current: false,
    })),
  }))

  it('cada coluna é uma navegação com o próprio título', () => {
    const html = footer({ columns })
    for (const column of columns) {
      expect(html).toContain(`aria-labelledby="rodape-${column.id}"`)
      expect(html).toContain(`>${column.title}<`)
    }
  })

  it('coluna sem links não aparece', () => {
    const html = footer({ columns: [{ id: 'v', title: 'Vazia', links: [] }], text: 'Oi' })
    expect(html).not.toContain('Vazia')
  })

  it('o painel lê as colunas salvas', () => {
    const data = toFooterData({
      columns: [
        {
          id: 'k',
          title: 'Institucional',
          links: [{ id: 'l', label: 'Quem somos', link: page(1) }],
        },
      ],
    } as never)
    expect(data.columns).toEqual([
      { id: 'k', title: 'Institucional', links: [{ id: 'l', label: 'Quem somos', link: page(1) }] },
    ])
    expect(toFooterData({}).columns).toEqual([])
  })
})

describe('M1: linha de cima', () => {
  it('só aparece com algo ligado', () => {
    expect(hasTopBar({ phone: null, hours: null, link: null })).toBe(false)
    expect(hasTopBar({ phone: null, hours: 'Seg a sex', link: null })).toBe(true)
  })

  it('mostra telefone, horário e link curto', () => {
    const html = renderToStaticMarkup(
      <SiteTopBarView
        bar={{
          phone: { label: '(31) 3333-0000', href: 'tel:+553133330000' },
          hours: 'Seg a sex, 8h às 18h',
          link: { label: 'Peça orçamento', href: '/orcamento' },
        }}
      />,
    )
    expect(html).toContain('tel:+553133330000')
    expect(html).toContain('Seg a sex, 8h às 18h')
    expect(html).toContain('href="/orcamento"')
  })

  it('no celular fica numa linha só e esconde o horário', () => {
    expect(siteCss).toMatch(/\.site-topbar[^{]*hours[^{]*\{[^}]*display:\s*none/)
  })
})
