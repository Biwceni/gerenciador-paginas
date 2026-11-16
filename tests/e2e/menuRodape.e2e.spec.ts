import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Menu, rodapé e WhatsApp do site (avaliação de 2026-11-16): topo em duas linhas no computador
// (T1), topo preso (T2), menu do celular em tela cheia (T3), nada alarga a página (T4), rodapé novo
// com a chamada (R1 a R6) e o WhatsApp com mensagem e controle do botão do canto (W1, W2).

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const LONG = 'Página com nome bem comprido'

let previous: { site: object; header: object; footer: object } | null = null
const pageIds: number[] = []

const content = (sections: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: sections },
})

const strip = (value: unknown) => {
  const {
    id: _i,
    updatedAt: _u,
    createdAt: _c,
    globalType: _g,
    ...rest
  } = value as Record<string, unknown>
  return rest
}

async function visit(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  // O arranjo do topo é medido no navegador: espera a medida.
  await expect(page.locator('.site-header')).toHaveClass(/site-header--(full|compact)/)
}

test.describe('site: menu, rodapé e WhatsApp', () => {
  test.beforeAll(async () => {
    const payload = await getPayload({ config })
    const [site, header, footer] = await Promise.all([
      payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true }),
      payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true }),
      payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true }),
    ])
    previous = { site: strip(site), header: strip(header), footer: strip(footer) }

    const sections = [
      {
        type: 'Features',
        props: {
          id: `Features-mr-${SUFFIX}`,
          menuLabel: '',
          title: 'Por que nós',
          items: ['Um', 'Dois', 'Três'].map((title) => ({ title, text: 'Texto. '.repeat(40) })),
          style: 'light',
        },
      },
      {
        type: 'Features',
        props: {
          id: `Features-mr2-${SUFFIX}`,
          menuLabel: '',
          title: 'Mais',
          items: ['Quatro', 'Cinco', 'Seis'].map((title) => ({
            title,
            text: 'Texto. '.repeat(40),
          })),
          style: 'light',
        },
      },
    ]
    for (const [index, title] of ['Início MR', 'Serviços MR'].entries()) {
      const created = await payload.create({
        collection: 'pages',
        data: {
          title,
          slug: `mr-${index}-${SUFFIX}`,
          content: content(sections),
          _status: 'published',
        },
        overrideAccess: true,
        context: { seedRecreate: true },
      })
      pageIds.push(created.id)
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Loja de Teste',
        homepage: pageIds[0],
        contact: {
          whatsapp: '(35) 99999-4521',
          phone: '(35) 3333-4521',
          email: 'oi@loja.com.br',
          address: 'Rua das Flores, 10',
          hours: 'Seg a sáb, 8h às 18h',
          whatsappMessage: 'Olá! Vim pelo site e quero um orçamento.',
          whatsappFloat: { phone: true, desktop: true },
        },
        social: { instagram: '@lojadeteste' },
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: Array.from({ length: 8 }, (_, index) => ({
          label: `${LONG} ${index}`.slice(0, 30),
          link: { kind: 'page' as const, page: pageIds[index % 2] },
        })),
        button: { label: 'Pedir orçamento', link: { kind: 'whatsapp' as const } },
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        text: 'Frase do rodapé.',
        showMenu: true,
        showContact: true,
        showSocial: true,
        showHours: true,
        showBackToTop: true,
        cta: { show: true, title: 'Pronto para começar?' },
        _status: 'published',
      },
      overrideAccess: true,
    })
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    if (previous) {
      for (const slug of ['site', 'header', 'footer'] as const) {
        await payload
          .updateGlobal({
            slug,
            data: { ...previous[slug], _status: 'published' } as never,
            overrideAccess: true,
          })
          .catch(() => undefined)
      }
    }
    for (const id of pageIds) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
  })

  test('T1, T2 e T4: computador com 8 links longos: duas linhas, topo preso e sem rolar para o lado', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await visit(page, '/')
    const header = page.locator('.site-header')
    await expect(header).toHaveClass(/site-header--rows/)
    await expect(page.locator('.site-header__burger')).toBeHidden()
    await expect(page.locator('.site-header__nav ul a').first()).toBeVisible()
    await expect(page.locator('.site-header__cta')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      1280,
    )

    await page.mouse.wheel(0, 1500)
    await expect(header).toHaveClass(/site-header--scrolled/)
    expect(await header.evaluate((element) => element.getBoundingClientRect().top)).toBe(0)
  })

  test('T3: no celular o menu abre em tela cheia e a página de trás não rola', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await visit(page, '/')
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const menu = page.locator('#menu-celular')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link', { name: 'WhatsApp' })).toBeVisible()
    await expect(menu.getByRole('link', { name: '@lojadeteste' })).toBeVisible()
    await expect(menu).toContainText('Seg a sáb, 8h às 18h')
    // Vai até o fim da tela (depois da entrada curta do menu).
    await expect
      .poll(async () => {
        const box = await menu.boundingBox()
        return Math.round((box?.y ?? 0) + (box?.height ?? 0))
      })
      .toBe(844)
    await page.mouse.wheel(0, 800)
    expect(await page.evaluate(() => scrollY)).toBe(0)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()

    // Ao descer, o topo sai da frente; ao subir um pouco, volta.
    await page.mouse.wheel(0, 900)
    await expect(page.locator('.site-header')).toHaveClass(/site-header--hidden/)
    await page.mouse.wheel(0, -60)
    await expect(page.locator('.site-header')).not.toHaveClass(/site-header--hidden/)
  })

  test('R1 a R4: chamada antes do rodapé e rodapé com rótulos, telefone, horário e redes', async ({
    page,
  }) => {
    await visit(page, '/')
    const cta = page.locator('.site-cta')
    await expect(cta).toContainText('Pronto para começar?')
    await expect(cta.getByRole('link', { name: 'Pedir orçamento' })).toBeVisible()
    const footer = page.locator('.site-footer')
    await expect(footer.getByRole('link', { name: /Telefone/ })).toHaveAttribute('href', /^tel:/)
    await expect(footer.getByRole('heading', { name: 'Horário' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Instagram de Loja de Teste' })).toBeVisible()
    await expect(footer.getByRole('link', { name: 'Voltar ao topo' })).toBeVisible()
  })

  test('W1 e W2: botão do canto no computador e conversa que já começa escrita', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const slug = `mr-1-${SUFFIX}`
    await visit(page, `/${slug}`)
    const float = page.locator('.wa-float')
    await expect(float).toBeVisible()
    await page.context().route('https://wa.me/**', (route) => route.abort())
    await float.click()
    await expect(float).toHaveAttribute(
      'href',
      /text=Ol%C3%A1%21\+Vim\+pelo\+site\+e\+quero\+um\+or%C3%A7amento\.\+%28p%C3%A1gina\+Servi%C3%A7os\+MR%29/,
    )
  })

  test('R6 e T4 no painel: chamada, horário e aviso do menu comprido', async ({ page }) => {
    await seedTestUser()
    await login({ page, user: testUser })
    await page.goto(`${BASE}/admin/menu-e-rodape`)
    await expect(page.locator('.gp-menufit')).toContainText('mais de uma linha')
    const title = page.getByLabel('Título da chamada')
    await expect(title).toHaveValue('Pronto para começar?')
    await expect(page.getByLabel('Mostrar o horário de funcionamento')).toBeChecked()
    await page.getByLabel('Mostrar a chamada').uncheck()
    await expect(title).toHaveCount(0)
    await expect(page.locator('.gp-savestatus')).toContainText('Guardado, falta publicar', {
      timeout: 15_000,
    })
    const payload = await getPayload({ config })
    const draft = await payload.findGlobal({ slug: 'footer', draft: true, overrideAccess: true })
    expect(draft.cta?.show).toBe(false)
    await cleanupTestUser()
  })
})
