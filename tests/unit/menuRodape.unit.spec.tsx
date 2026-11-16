import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { estimateMenuFit } from '@/components/panel/MenuEditor'
import {
  type FooterContact,
  headerShortcuts,
  SiteFooterView,
  SiteHeaderView,
} from '@/components/site/SiteChrome'
import { WhatsAppFloat } from '@/components/site/WhatsAppFloat'
import { logoBlends } from '@/lib/brand'
import { DEFAULT_WHATSAPP_MESSAGE, whatsAppGreeting, withWhatsAppText } from '@/lib/links'
import { templateSeeds } from '@/seed/templates/data'

// Menu, rodapé e WhatsApp do site (avaliação de 2026-11-16: T1, T3, T4, T6, R1 a R6, W1, W2).

const contact: FooterContact = {
  whatsapp: '(35) 99876-5432',
  whatsappHref: 'https://wa.me/5535998765432',
  phone: '(35) 3333-4521',
  phoneHref: 'tel:+553533334521',
  email: 'oi@loja.com.br',
  address: 'Rua A, 10',
  hours: 'Seg a sáb, 8h às 18h',
}
const none: FooterContact = {
  whatsapp: null,
  whatsappHref: null,
  phone: null,
  phoneHref: null,
  email: null,
  address: null,
  hours: null,
}
const footer = (props: Partial<React.ComponentProps<typeof SiteFooterView>> = {}) =>
  renderToStaticMarkup(
    <SiteFooterView
      contact={contact}
      menu={[]}
      name="Loja"
      showContact
      social={[]}
      text="Frase"
      {...props}
    />,
  )

describe('W2: a conversa no WhatsApp já começa escrita', () => {
  it('junta a mensagem e a página de onde a pessoa veio', () => {
    expect(whatsAppGreeting('Olá! Quero agendar.', 'Serviços')).toBe(
      'Olá! Quero agendar. (página Serviços)',
    )
    expect(whatsAppGreeting('  ', null)).toBe(DEFAULT_WHATSAPP_MESSAGE)
  })

  it('não troca a mensagem dos produtos nem mexe em outros links', () => {
    const product = 'https://wa.me/5535998765432?text=Quero+saber'
    expect(withWhatsAppText(product, 'Oi')).toBe(product)
    expect(withWhatsAppText('https://wa.me/5535998765432', 'Oi (página A)')).toBe(
      'https://wa.me/5535998765432?text=Oi+%28p%C3%A1gina+A%29',
    )
    expect(withWhatsAppText('https://exemplo.com/', 'Oi')).toBe('https://exemplo.com/')
  })

  it('cada modelo de ramo traz a sua mensagem e o título da chamada', () => {
    for (const seed of templateSeeds) {
      if (seed.kind !== 'site') continue
      expect(seed.site?.whatsappMessage, seed.key).toMatch(/^Olá! Vim pel/)
      if (seed.pages?.some((page) => page.campaign)) continue
      expect(seed.footer?.ctaTitle?.length, seed.key).toBeLessThanOrEqual(50)
    }
  })
})

describe('W1: botão do canto controlado no painel', () => {
  it('celular ligado e computador desligado por padrão; os dois desligados, nenhum botão', () => {
    expect(renderToStaticMarkup(<WhatsAppFloat href="https://wa.me/55" />)).not.toContain('data-')
    const both = renderToStaticMarkup(<WhatsAppFloat desktop href="https://wa.me/55" />)
    expect(both).toContain('data-desktop')
    const desktopOnly = renderToStaticMarkup(
      <WhatsAppFloat desktop href="https://wa.me/55" phone={false} />,
    )
    expect(desktopOnly).toContain('data-phone-off')
    expect(
      renderToStaticMarkup(<WhatsAppFloat desktop={false} href="https://wa.me/55" phone={false} />),
    ).toBe('')
  })
})

describe('R1 a R5: rodapé', () => {
  it('chamada com o botão do topo, contato com telefone e rótulos, horário com coluna', () => {
    const html = footer({ cta: { title: 'Vamos?', button: { label: 'Agendar', href: '/a' } } })
    expect(html).toContain('site-cta')
    expect(html).toContain('Vamos?')
    expect(html).toContain('tel:+553533334521')
    expect(html).toContain('<small>Telefone</small>')
    expect(html).toContain('Endereço · ver no mapa')
    expect(html).toContain('>Horário</h2>')
    expect(html).toContain('Voltar ao topo')
  })

  it('redes como ícones com nome para o leitor de tela; páginas em duas colunas a partir de 6', () => {
    const menu = Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      label: `P${index}`,
      href: `/p${index}`,
      current: false,
    }))
    const html = footer({
      menu,
      social: [{ key: 'instagram', label: 'Instagram @loja', url: 'https://instagram.com/loja' }],
    })
    expect(html).toContain('aria-label="Instagram de Loja"')
    expect(html).toContain('site-footer__pages--two')
    expect(footer({ menu: menu.slice(0, 5) })).not.toContain('site-footer__pages--two')
  })

  it('horário e "Voltar ao topo" desligados somem', () => {
    const html = footer({ showHours: false, backToTop: false })
    expect(html).not.toContain('>Horário</h2>')
    expect(html).not.toContain('Voltar ao topo')
  })

  it('tudo desligado vira uma linha só (R5)', () => {
    const html = footer({ contact: none, text: null, showContact: false })
    expect(html).toContain('site-footer--line')
    expect(html).not.toContain('site-footer__cols')
  })
})

describe('T3 e T6: topo', () => {
  it('menu do celular com atalhos, endereço, horário e o botão no fim', () => {
    const html = renderToStaticMarkup(
      <SiteHeaderView
        button={{ label: 'Agendar', href: '/a' }}
        items={[{ id: '1', label: 'Início', href: '/', current: true }]}
        logo={null}
        name="Loja"
        shortcuts={headerShortcuts({
          contact: { whatsapp: '35998765432', address: 'Rua A', hours: '8h às 18h' },
          social: { instagram: '@loja' },
        })}
      />,
    )
    // O menu do ☰ só existe depois que a página carrega (fica fora do topo): aqui, o desktop.
    expect(html).toContain('site-header__nav')
    expect(html).toContain('site-header__cta')
  })

  it('logo que some no fundo ganha contorno', () => {
    expect(logoBlends([{ color: '#111111', share: 0.9 }], '#151515')).toBe(true)
    expect(logoBlends([{ color: '#111111', share: 0.9 }], '#ffffff')).toBe(false)
    expect(logoBlends([], '#000000')).toBe(false)
  })
})

describe('T4: aviso do menu comprido no painel', () => {
  it('cabe numa linha, vai para a segunda linha ou nem a segunda comporta', () => {
    expect(estimateMenuFit('Café', false, ['Início', 'Sobre', 'Contato'], 'Pedir')).toBe('one')
    expect(
      estimateMenuFit(
        'Confeitaria da Vovó Maria',
        false,
        [
          'Início',
          'Cardápio',
          'Galeria',
          'Encomendas',
          'Sobre nós',
          'Perguntas frequentes',
          'Depoimentos',
          'Contato',
        ],
        'Pedir pelo WhatsApp',
      ),
    ).toBe('rows')
    expect(
      estimateMenuFit('Café', false, Array(8).fill('Página com nome bem comprido 0'), ''),
    ).toBe('wrap')
  })
})
