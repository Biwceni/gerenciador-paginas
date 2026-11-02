import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Ajustes do QA visual e da revisão de design (painel e site), no banco de TEST_DATABASE_URL.
// Sem o Storage: as fotos ficam no próprio servidor (e vão sem o otimizador de imagens).

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()
const WIDTHS = [390, 768, 1024, 1440]
const LONG_BUTTON = 'Agende sua consulta agora'

// PNG de 1 pixel, que o servidor consegue ler.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)

let homeId: number
let innerId: number
const photoIds: number[] = []
// Configurações e topo de antes: os testes seguintes (como o site novo) contam com eles.
let previous: { site: object; header: object } | null = null

const content = (sections: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: sections },
})

const homeContent = () =>
  content([
    {
      type: 'Hero',
      props: {
        id: 'Hero-qa',
        title: 'Sorrisos cuidados com carinho',
        text: 'Clínica no centro da cidade.',
        button: { label: 'Agendar avaliação', link: { kind: 'whatsapp' } },
        image: { mediaId: photoIds[0] },
        style: 'side',
        align: 'left',
      },
    },
    // Salvo como antes do marcador existir: sem `marker` e sem `icon`.
    {
      type: 'Features',
      props: {
        id: 'Features-qa',
        menuLabel: '',
        title: 'Por que nós',
        items: [
          { title: 'Atendimento rápido', text: 'No mesmo dia.' },
          { title: 'Perto de você', text: 'No centro.' },
          { title: 'Preço justo', text: 'Parcelamos.' },
        ],
        style: 'light',
      },
    },
    {
      type: 'Faq',
      props: {
        id: 'Faq-qa',
        menuLabel: '',
        title: 'Perguntas',
        items: [{ question: 'Atendem no sábado de manhã?', answer: 'Sim, das 8h às 12h.' }],
        style: 'soft',
      },
    },
    {
      type: 'CallToAction',
      props: {
        id: 'Cta-qa',
        menuLabel: '',
        title: 'Vamos conversar?',
        text: 'Chame no WhatsApp.',
        button: { label: 'Chamar', link: { kind: 'whatsapp' } },
        style: 'brand',
      },
    },
  ])

const innerContent = () =>
  content([
    {
      type: 'Gallery',
      props: {
        id: 'Gallery-qa',
        menuLabel: '',
        title: 'Fotos',
        images: photoIds.map((mediaId) => ({ mediaId })),
        style: 'light',
      },
    },
    {
      type: 'Contact',
      props: {
        id: 'Contact-qa',
        menuLabel: '',
        title: 'Fale com a gente',
        text: '',
        style: 'light',
      },
    },
  ])

/** A página não rola para o lado. */
async function noSideScroll(page: Page, where: string) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }))
  expect(scroll, `${where} rola para o lado`).toBeLessThanOrEqual(width)
}

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
}

test.describe.serial('QA visual e revisão de design', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    for (const index of [1, 2, 3]) {
      const photo = await payload.create({
        collection: 'media',
        data: { alt: `Foto de teste ${index}` },
        file: {
          data: PNG,
          mimetype: 'image/png',
          name: `qa-${SUFFIX}-${index}.png`,
          size: PNG.length,
        },
        overrideAccess: true,
      })
      photoIds.push(photo.id)
    }
    const home = await payload.create({
      collection: 'pages',
      data: {
        title: 'Início QA',
        slug: `inicio-qa-${SUFFIX}`,
        content: homeContent(),
        _status: 'published',
      },
      overrideAccess: true,
    })
    const inner = await payload.create({
      collection: 'pages',
      data: {
        title: 'Fotos QA',
        slug: `fotos-qa-${SUFFIX}`,
        content: innerContent(),
        _status: 'published',
      },
      overrideAccess: true,
    })
    homeId = home.id
    innerId = inner.id
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
    previous = {
      // Valores explícitos: num banco zerado as Configurações ainda não existem, e um contato
      // vazio ({}) não apagaria o WhatsApp e o telefone deste teste.
      site: {
        ...(site.name ? { name: site.name } : {}),
        homepage: site.homepage ?? null,
        contact: {
          whatsapp: site.contact?.whatsapp ?? null,
          phone: site.contact?.phone ?? null,
        },
      },
      header: { items: header.items, button: header.button },
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Clínica Sorriso Leve',
        homepage: homeId,
        contact: { whatsapp: '(35) 99999-4521', phone: '(35) 3333-4521' },
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: ['Início', 'Tratamentos', 'Quem somos', 'Contato'].map((label) => ({
          label,
          link: { kind: 'page' as const, page: label === 'Contato' ? innerId : homeId },
        })),
        button: { label: LONG_BUTTON, link: { kind: 'whatsapp' } },
        _status: 'published',
      },
      overrideAccess: true,
    })

    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    const payload = await panel()
    if (previous) {
      await payload.updateGlobal({
        slug: 'header',
        data: { ...previous.header, _status: 'published' },
        overrideAccess: true,
      })
      await payload.updateGlobal({
        slug: 'site',
        data: { ...previous.site, _status: 'published' },
        overrideAccess: true,
      })
    }
    for (const id of [homeId, innerId]) {
      if (id) {
        await payload.delete({
          collection: 'pages',
          id,
          overrideAccess: true,
          context: { seedRecreate: true },
        })
      }
    }
    for (const id of photoIds)
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    await page?.close()
    await cleanupTestUser()
  })

  test('nenhuma tela do painel rola para o lado (com Minha conta e o editor)', async () => {
    const screens = [
      '/admin',
      '/admin/paginas',
      '/admin/paginas/nova',
      '/admin/fotos',
      '/admin/menu-e-rodape',
      '/admin/mensagens',
      '/admin/formularios',
      '/admin/configuracoes',
      '/admin/avancado',
      '/admin/account',
      `/admin/editor/${homeId}`,
    ]
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of screens) {
        await open(page, path)
        await noSideScroll(page, `${path} em ${width} px`)
      }
    }
  })

  test('nenhuma página do site rola para o lado', async () => {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['/', `/fotos-qa-${SUFFIX}`]) {
        await open(page, path)
        await noSideScroll(page, `${path} em ${width} px`)
      }
    }
  })

  test('nenhum texto do painel abaixo de 13 px nas telas principais', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const path of [
      '/admin',
      '/admin/paginas',
      '/admin/fotos',
      '/admin/configuracoes',
      '/admin/account',
      '/admin/formularios',
      '/admin/mensagens',
      '/admin/menu-e-rodape',
    ]) {
      await open(page, path)
      const small = await page.evaluate(() => {
        const found: string[] = []
        const walker = document.createTreeWalker(
          document.querySelector('.gp-page') ?? document.body,
          NodeFilter.SHOW_TEXT,
        )
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const element = node.parentElement
          if (!element || !node.textContent?.trim()) continue
          // Texto escondido ou dentro das prévias do site (que seguem o site, não o painel).
          if (!element.checkVisibility() || element.closest('iframe, .gp-sr')) continue
          const size = parseFloat(getComputedStyle(element).fontSize)
          if (size < 13) found.push(`${size}px "${node.textContent.trim().slice(0, 30)}"`)
        }
        return found
      })
      expect(small, path).toEqual([])
    }
  })

  test('em Páginas, só um botão principal', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/paginas')
    await expect(page.locator('.gp-page .gp-btn--primary')).toHaveCount(1)
    await expect(page.locator('.gp-page .gp-btn--primary')).toHaveText(/Nova página/)
    await expect(page.getByRole('button', { name: 'Mais opções de Início QA' })).toBeVisible()
  })

  test('Fotos com mais de uma foto por linha em 1024 px', async () => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await open(page, '/admin/fotos')
    const tops = await page
      .locator('.gp-media__item')
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
    expect(tops.length).toBeGreaterThanOrEqual(3)
    expect(tops.filter((top) => top === tops[0]).length).toBeGreaterThan(1)
  })

  test('a escolha de tema em Minha conta troca o data-theme e continua depois de recarregar', async () => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await open(page, '/admin/account')
    await page.getByLabel('Escuro').check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.getByLabel('Escuro')).toBeChecked()
    await page.getByLabel('Claro').check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('foco visível no menu lateral', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/paginas')
    let outline = ''
    for (let step = 0; step < 15 && !outline; step++) {
      await page.keyboard.press('Tab')
      outline = await page.evaluate(() => {
        const element = document.activeElement
        if (!element?.classList.contains('gp-nav__link')) return ''
        const style = getComputedStyle(element)
        return `${style.outlineStyle} ${style.outlineWidth}`
      })
    }
    expect(outline).toBe('solid 2px')
  })

  test('botão do topo do site em uma linha só em 740 px', async () => {
    await page.setViewportSize({ width: 740, height: 900 })
    await open(page, '/')
    const header = page.locator('.site-header')
    // Não cabe numa linha: o topo usa o ☰, e o botão aparece inteiro no menu aberto.
    const burger = page.getByRole('button', { name: 'Abrir menu' })
    if (await burger.isVisible()) await burger.click()
    const button = page
      .locator('.site-header a.button', { hasText: LONG_BUTTON })
      .locator('visible=true')
    await expect(button).toHaveCount(1)
    const lines = await button.evaluate((element) => {
      const style = getComputedStyle(element)
      const text =
        element.getBoundingClientRect().height -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom)
      return Math.round(text / parseFloat(style.lineHeight || '20'))
    })
    expect(lines).toBe(1)
    expect(
      await header
        .locator('.site-header__bar')
        .evaluate((bar) => bar.getBoundingClientRect().height),
    ).toBeLessThan(80)
  })

  test('Destaques sem números quando o marcador é "Nenhum"', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/')
    await expect(page.locator('.features')).toHaveCount(1)
    await expect(page.locator('.features__number')).toHaveCount(0)
    await expect(page.locator('ol.features')).toHaveCount(0)
    await expect(page.locator('.features__item')).toHaveCount(3)
  })

  test('Banner "Foto ao lado" com a foto embaixo do botão em 390 px', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    const button = page.locator('.hero .button')
    const photo = page.locator('.hero__photo')
    await expect(photo).toBeVisible()
    const buttonBox = await button.boundingBox()
    const photoBox = await photo.boundingBox()
    expect(photoBox!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height)

    // No computador, a foto fica ao lado do texto.
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/')
    const side = await page.locator('.hero__photo').boundingBox()
    const text = await page.locator('.hero__inner').boundingBox()
    expect(side!.x).toBeGreaterThan(text!.x + text!.width - 1)
  })

  test('telefone com o código do país e galeria ímpar no celular', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, `/fotos-qa-${SUFFIX}`)
    await expect(page.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:+553533334521')
    const last = await page.locator('.gallery li').last().boundingBox()
    const gallery = await page.locator('.gallery').boundingBox()
    expect(Math.round(last!.width)).toBe(Math.round(gallery!.width))
  })

  test('antes do JavaScript, nome e menu do topo não se sobrepõem em 740 px', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 740, height: 900 },
    })
    const visitor = await context.newPage()
    await visitor.goto(`${BASE}/`)
    // Sem JavaScript, o topo fica com o ☰: o menu inteiro não aparece por cima do nome.
    await expect(visitor.locator('.site-header__nav')).toBeHidden()
    await expect(visitor.locator('.site-header__burger')).toBeVisible()
    await context.close()
  })

  test('no celular, cada link do rodapé tem 44 px e não invade o de baixo', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    const links = await page.locator('.site-footer li > a').evaluateAll((elements) =>
      elements.map((element) => {
        element.scrollIntoView({ block: 'center' })
        const box = element.getBoundingClientRect()
        // A borda de baixo ainda é deste link, e o ponto logo abaixo já não é. (Sem função com
        // nome aqui dentro: o tsx a embrulharia num `__name`, que não existe no navegador.)
        const bottom = document.elementFromPoint(box.left + 4, box.bottom - 1)
        const below = document.elementFromPoint(box.left + 4, box.bottom + 1)
        return {
          height: Math.round(box.height),
          ownBottom: bottom === element || element.contains(bottom),
          nextIsOther: below !== element && !element.contains(below),
        }
      }),
    )
    expect(links.length).toBeGreaterThan(2)
    for (const link of links) {
      expect(link.height).toBeGreaterThanOrEqual(44)
      expect(link.ownBottom).toBe(true)
      expect(link.nextIsOther).toBe(true)
    }
  })
})
