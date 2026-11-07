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

let homeId: number
let previous: object | null = null

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
    if (homeId) {
      await payload.delete({
        collection: 'pages',
        id: homeId,
        overrideAccess: true,
        context: { seedRecreate: true },
      })
    }
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

  test('Configurações: escolher a personalidade muda a prévia e só vai ao ar ao publicar', async () => {
    await publishPersonality('classico')
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/configuracoes')
    const option = page.getByRole('button', { name: /^Aconchego/ })
    await option.click()
    await expect(option).toHaveAttribute('aria-pressed', 'true')
    const preview = page.frameLocator('iframe[title="Prévia das cores e letras"]')
    await expect(preview.locator('body')).toHaveAttribute('data-personality', 'aconchego')

    // Rascunho: o site continua Clássico até publicar.
    await expect(page.getByText('Guardado, falta publicar')).toBeVisible({ timeout: 20_000 })
    await open(page, '/')
    await expect(page.locator('body')).toHaveAttribute('data-personality', 'classico')

    await open(page, '/admin/configuracoes')
    await page.getByRole('button', { name: 'Publicar configurações' }).click()
    await expect(page.getByText('Configurações publicadas em todo o site.')).toBeVisible({
      timeout: 20_000,
    })
    await open(page, '/')
    await expect(page.locator('body')).toHaveAttribute('data-personality', 'aconchego')
  })
})
