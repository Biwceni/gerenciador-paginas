import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SiteFooterView } from '@/components/site/SiteChrome'
import { exampleTexts } from '@/lib/examples'
import { ADVANCED_SCREENS } from '@/lib/panel'
import { PRIVACY_TEMPLATE_KEY, PRIVACY_TITLE, privacyBlocks } from '@/lib/privacy'
import type { Template } from '@/payload-types'
import { Form, Privacy } from '@/puck/components/sections'
import { type ContentMetadata, mainHeadingID } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent } from '@/puck/schema'
import { templateSeeds } from '@/seed/templates/data'

const metadata = (site: Partial<ContentMetadata['site']>): ContentMetadata => ({
  photos: {},
  forms: { 1: { id: 1, title: 'Contato', successMessage: '', submitLabel: 'Enviar', fields: [] } },
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: null,
  site: { name: 'Café Grão', logo: null, contact: {}, ...site },
})

const section = {
  id: 'p',
  menuLabel: '',
  title: 'Política de privacidade',
  style: 'light',
} as const

const policy = (site: Partial<ContentMetadata['site']>) =>
  renderToStaticMarkup(<Privacy {...section} metadata={metadata(site)} />)

describe('seção Política de privacidade', () => {
  it('mostra os dados atuais das Configurações', () => {
    const html = policy({
      name: 'Café Grão',
      contact: { email: 'oi@cafe.com.br', address: 'Rua A, 10' },
    })
    expect(html).toContain('como Café Grão cuida dos dados')
    expect(html).toContain('href="mailto:oi@cafe.com.br"')
    expect(html).toContain('Rua A, 10')

    // Nada é copiado para a página: outro e-mail nas Configurações, outro texto.
    const changed = policy({ name: 'Café Grão', contact: { email: 'novo@cafe.com.br' } })
    expect(changed).toContain('novo@cafe.com.br')
    expect(changed).not.toContain('oi@cafe.com.br')
  })

  it('campo vazio nas Configurações não aparece', () => {
    const html = policy({ contact: { email: null, address: '  ' } })
    expect(html).not.toContain('E-mail:')
    expect(html).not.toContain('Endereço:')
    expect(html).not.toContain('<ul>')
    expect(html).toContain('pelos contatos deste site')
    expect(privacyBlocks({ name: ' ' })[0].text).toContain('como cuidamos dos dados')
  })

  it('só o e-mail, sem o endereço', () => {
    const html = policy({ contact: { email: 'oi@cafe.com.br', address: '' } })
    expect(html).toContain('E-mail:')
    expect(html).not.toContain('Endereço:')
  })

  it('na prévia do editor, o e-mail não é link', () => {
    const html = renderToStaticMarkup(
      <Privacy
        {...section}
        metadata={{ ...metadata({ contact: { email: 'oi@cafe.com.br' } }), editing: true }}
      />,
    )
    expect(html).toContain('oi@cafe.com.br')
    expect(html).not.toContain('mailto:')
  })

  it('como primeira seção, leva o título principal da página', () => {
    const parsed = parsePageContent({
      version: CONTENT_VERSION,
      data: { root: { props: {} }, content: [{ type: 'Privacy', props: section }] },
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(mainHeadingID(parsed.data.data)).toBe('p')
  })

  it('o modelo de página usa a seção', () => {
    const seed = templateSeeds.find((item) => item.key === PRIVACY_TEMPLATE_KEY)
    expect(seed?.kind).toBe('page')
    const parsed = parsePageContent(seed?.pages?.[0]?.content)
    expect(parsed.success && parsed.data.data.content.map((item) => item.type)).toEqual(['Privacy'])
  })
})

describe('modelo de privacidade', () => {
  it('o título não conta como texto de exemplo a trocar', () => {
    const texts = exampleTexts(templateSeeds as Pick<Template, 'pages'>[])
    expect(texts.length).toBeGreaterThan(0)
    expect(texts).not.toContain(PRIVACY_TITLE.toLowerCase())
  })
})

describe('link Privacidade', () => {
  const footer = (privacyHref: string | null, campaign = false) =>
    renderToStaticMarkup(
      <SiteFooterView
        campaign={campaign}
        contact={{ whatsapp: null, whatsappHref: null, email: null, address: null, hours: null }}
        menu={[]}
        name="Café"
        privacyHref={privacyHref}
        showContact
        social={[]}
        text={null}
      />,
    )

  it('no rodapé, só com a página publicada', () => {
    expect(footer('/politica-de-privacidade')).toContain('href="/politica-de-privacidade"')
    expect(footer('/politica-de-privacidade', true)).toContain('Privacidade')
    expect(footer(null)).not.toContain('Privacidade')
  })

  const form = (site: Partial<ContentMetadata['site']>, editing = false) =>
    renderToStaticMarkup(
      <Form
        form={{ formId: 1 }}
        id="f"
        menuLabel=""
        metadata={{ ...metadata(site), editing }}
        style="light"
        successMessage=""
        text=""
        title=""
      />,
    )

  it('no "Concordo", só com a página publicada', () => {
    expect(form({ privacyHref: '/politica-de-privacidade' })).toContain(
      'href="/politica-de-privacidade"',
    )
    expect(form({ privacyHref: null })).not.toContain('política de privacidade')
  })

  it('na prévia do editor, não sai da tela', () => {
    const html = form({ privacyHref: '/politica-de-privacidade' }, true)
    expect(html).toContain('política de privacidade')
    expect(html).not.toContain('href="/politica-de-privacidade"')
  })
})

describe('tela Avançado', () => {
  it('lista só Usuários e Fotos', () => {
    expect(ADVANCED_SCREENS.map((screen) => screen.slug)).toEqual(['users', 'media'])
  })
})
