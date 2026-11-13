import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Redesign v3, entrega 1: personalidades do site, no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()
const WIDTHS = [390, 768, 1024, 1440]
const PERSONALITIES = ['classico', 'vitrine', 'aconchego', 'editorial'] as const

const COVER_SLUG = `vitrine-${SUFFIX}`

// PNG de 1 pixel, que o servidor consegue ler.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
)

let homeId: number
let coverId: number
let photoId: number
let previous: object | null = null

/** Fundo do topo do site, como o visitante vê. */
const headerBackground = (page: Page) =>
  page.locator('.site-header').evaluate((header) => getComputedStyle(header).backgroundColor)

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
}

async function publishPersonality(personality: (typeof PERSONALITIES)[number]) {
  const payload = await panel()
  await payload.updateGlobal({
    slug: 'site',
    data: { personality, _status: 'published' },
    overrideAccess: true,
  })
}

test.describe.serial('personalidades do site', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    const home = await payload.create({
      collection: 'pages',
      data: {
        title: `Personalidades ${SUFFIX}`,
        slug: `personalidades-${SUFFIX}`,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Hero',
                props: {
                  id: 'Hero-p',
                  title: 'Café feito com calma',
                  highlight: 'com calma',
                  text: 'Torrado toda semana.',
                  image: null,
                  button: { label: 'Fale com a gente', link: { kind: 'whatsapp' } },
                  style: 'soft',
                  align: 'left',
                  height: 'normal',
                },
              },
              {
                type: 'Features',
                props: {
                  id: 'Features-p',
                  menuLabel: '',
                  title: 'Por que a gente',
                  marker: 'none',
                  items: ['Grão', 'Torra', 'Entrega'].map((title) => ({
                    title,
                    text: 'Uma frase curta.',
                    icon: 'check',
                  })),
                  style: 'light',
                },
              },
            ],
          },
        },
        _status: 'published',
      },
      overrideAccess: true,
    })
    homeId = home.id
    const photo = await payload.create({
      collection: 'media',
      data: { alt: 'Xícara de café' },
      file: { data: PNG, mimetype: 'image/png', name: `vitrine-${SUFFIX}.png`, size: PNG.length },
      overrideAccess: true,
    })
    photoId = photo.id
    // Banner "Foto" no topo da página: é onde a Vitrine põe o topo por cima da foto.
    const cover = await payload.create({
      collection: 'pages',
      data: {
        title: `Vitrine ${SUFFIX}`,
        slug: COVER_SLUG,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Hero',
                props: {
                  id: 'Hero-capa',
                  title: 'Café da Serra',
                  highlight: '',
                  text: 'Torrado toda semana.',
                  image: { mediaId: photo.id },
                  button: null,
                  style: 'image',
                  align: 'left',
                  height: 'normal',
                },
              },
              {
                type: 'RichText',
                props: {
                  id: 'RichText-capa',
                  menuLabel: '',
                  title: 'Nossa história',
                  body: `<p>${'Texto para a página ter o que rolar. '.repeat(60)}</p>`,
                  style: 'light',
                },
              },
            ],
          },
        },
        _status: 'published',
      },
      overrideAccess: true,
    })
    coverId = cover.id
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    previous = {
      ...(site.name ? { name: site.name } : {}),
      homepage: site.homepage ?? null,
      personality: site.personality ?? 'classico',
    }
    await payload.updateGlobal({
      slug: 'site',
      data: { name: 'Café da Serra', homepage: homeId, _status: 'published' },
      overrideAccess: true,
    })
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    const payload = await panel()
    if (previous) {
      await payload.updateGlobal({
        slug: 'site',
        data: { ...previous, _status: 'published' },
        overrideAccess: true,
      })
    }
    for (const id of [homeId, coverId]) {
      if (!id) continue
      await payload.delete({
        collection: 'pages',
        id,
        overrideAccess: true,
        context: { seedRecreate: true },
      })
    }
    if (photoId) await payload.delete({ collection: 'media', id: photoId, overrideAccess: true })
    await page?.close()
    await cleanupTestUser()
  })

  test('cada personalidade vai para o body e não rola para o lado', async () => {
    for (const personality of PERSONALITIES) {
      await publishPersonality(personality)
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await open(page, '/')
        await expect(page.locator('body')).toHaveAttribute('data-personality', personality)
        const { scroll, client } = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }))
        expect(scroll, `${personality} em ${width} px rola para o lado`).toBeLessThanOrEqual(client)
      }
    }
  })

  test('as palavras em destaque viram itálico no título', async () => {
    await open(page, '/')
    await expect(page.locator('.hero__title em')).toHaveText('com calma')
    await expect(page.locator('.hero__title em')).toHaveCSS('font-style', 'italic')
  })

  test('o layout segue a largura do site, não da janela (container)', async () => {
    await publishPersonality('editorial')
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/')
    // Três destaques lado a lado no computador; o site estreitado vira uma coluna, com a janela
    // do mesmo tamanho.
    const lefts = () =>
      page
        .locator('.features__item')
        .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().left)))
    expect(new Set(await lefts()).size).toBe(3)
    await page.evaluate(() => {
      document.body.style.width = '400px'
    })
    expect(new Set(await lefts()).size).toBe(1)
  })

  test('Vitrine: topo por cima da foto fica sólido ao rolar; com menos movimento, topo de sempre', async () => {
    await publishPersonality('vitrine')
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, `/${COVER_SLUG}`)
    await expect(page.locator('.site-header')).toHaveCSS('position', 'sticky')
    expect(await headerBackground(page)).toBe('rgba(0, 0, 0, 0)')
    // O topo cobre o começo da foto: o banner sobe até o alto da página.
    const [header, hero] = await Promise.all(
      ['.site-header', '.hero'].map((selector) => page.locator(selector).boundingBox()),
    )
    expect(Math.round(hero!.y)).toBe(Math.round(header!.y))

    await page.mouse.wheel(0, 600)
    await expect.poll(() => headerBackground(page)).not.toBe('rgba(0, 0, 0, 0)')

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, `/${COVER_SLUG}`)
    await expect(page.locator('.site-header')).toHaveCSS('position', 'relative')
    expect(await headerBackground(page)).not.toBe('rgba(0, 0, 0, 0)')
    await page.emulateMedia({ reducedMotion: null })
  })

  test('editor: a prévia do celular usa a arrumação de celular', async () => {
    await publishPersonality('editorial')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`${BASE}/admin/editor/${homeId}`)
    const items = page.frameLocator('#preview-frame').locator('.features__item')
    await expect(items).toHaveCount(3, { timeout: 120_000 })
    const columns = async () =>
      new Set(
        await items.evaluateAll((list) =>
          list.map((item) => Math.round(item.getBoundingClientRect().left)),
        ),
      ).size
    await expect.poll(columns).toBe(3)
    await page.getByRole('button', { name: 'Ver como celular' }).click()
    await expect.poll(columns).toBe(1)
  })

  test('Sua marca: escolher a personalidade muda a prévia e só vai ao ar ao publicar', async () => {
    await publishPersonality('classico')
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/sua-marca')
    const option = page.getByRole('button', { name: /^Aconchego/ })
    await option.click()
    await expect(option).toHaveAttribute('aria-pressed', 'true')
    const preview = page.frameLocator('iframe[title="Prévia da sua marca"]')
    await expect(preview.locator('body')).toHaveAttribute('data-personality', 'aconchego')

    // Rascunho: o site continua Clássico até publicar.
    await expect(page.getByText('Guardado, falta publicar')).toBeVisible({ timeout: 20_000 })
    await open(page, '/')
    await expect(page.locator('body')).toHaveAttribute('data-personality', 'classico')

    await open(page, '/admin/sua-marca')
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(page.getByText('Sua marca foi publicada em todo o site.')).toBeVisible({
      timeout: 20_000,
    })
    await open(page, '/')
    await expect(page.locator('body')).toHaveAttribute('data-personality', 'aconchego')
  })
})
