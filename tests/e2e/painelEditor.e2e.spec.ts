import { createRequire } from 'node:module'

import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Redesign v3, entrega 5: identidade do produto no painel e no editor (porcelana e anil), no banco
// de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const panel = () => getPayload({ config })
const SUFFIX = Date.now()

let homeId: number
let previous: Record<string, unknown> | null = null

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
}

/** Violações "serious" e "critical" do axe (WCAG 2.1 AA) na tela aberta. */
async function seriousViolations(page: Page): Promise<string[]> {
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (...args: unknown[]) => Promise<{ violations: { id: string; impact: string }[] }>
        }
      }
    ).axe
    const result = await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
    })
    return result.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => violation.id)
  })
}

test.describe.serial('Painel e editor no visual do produto', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    const home = await payload.create({
      collection: 'pages',
      data: {
        title: 'Início',
        slug: `inicio-${SUFFIX}`,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Hero',
                props: {
                  id: 'Hero-p',
                  title: 'Doces feitos à mão',
                  highlight: '',
                  text: 'Encomendas pelo WhatsApp.',
                  image: null,
                  button: null,
                  style: 'brand',
                  align: 'left',
                  height: 'normal',
                },
              },
              {
                type: 'TextImage',
                props: {
                  id: 'TextImage-p',
                  menuLabel: '',
                  title: 'Nossa cozinha',
                  text: 'Tudo feito no dia.',
                  image: null,
                  side: 'right',
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
      colors: site.colors,
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Doces da Ana',
        homepage: homeId,
        personality: 'classico',
        colors: { ...site.colors, primary: '#a0306a' },
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

  test('cores, letras e favicon do produto', async () => {
    await open(page, '/admin')
    const colors = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        accent: style.getPropertyValue('--gp-accent').trim(),
        bg: style.getPropertyValue('--gp-bg').trim(),
        body: style.getPropertyValue('--font-body'),
        display: style.getPropertyValue('--gp-font-display'),
      }
    })
    expect(colors.accent).toBe('#2f43c9')
    expect(colors.bg).toBe('#f4f4f1')
    expect(colors.body).toMatch(/Onest/)
    expect(colors.display).toMatch(/Familjen/)
    const icon = await page.locator('link[rel="icon"]').first().getAttribute('href')
    expect(icon).toMatch(/^data:image\/svg\+xml,/)
  })

  test('menu: tela aberta em anil suave, chip do site no pé', async () => {
    const current = page
      .getByRole('navigation', { name: 'Menu do painel' })
      .locator('a[aria-current="page"]')
    await expect(current).toHaveText(/Painel/)
    const style = await current.evaluate((element) => {
      const computed = getComputedStyle(element)
      return { color: computed.color, background: computed.backgroundColor }
    })
    expect(style.color).toBe('rgb(47, 67, 201)')
    expect(style.background).toBe('rgb(229, 232, 251)')
    await expect(page.locator('.gp-sitechip')).toContainText('Doces da Ana')
    await expect(page.locator('.gp-sitechip')).toContainText('localhost:3000')
  })

  test('início: miniatura ao vivo do site no ar, sem foco nem clique', async () => {
    const card = page.locator('.gp-sitecard')
    await expect(card.getByText('No ar', { exact: true })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Ver site' })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Editar o Início' })).toHaveAttribute(
      'href',
      `/admin/editor/${homeId}`,
    )
    const mini = card.locator('.gp-sitecard__mini')
    await expect(mini).toHaveAttribute('inert', '')
    await expect(mini).toHaveAttribute('aria-hidden', 'true')
    const frame = mini.locator('iframe').contentFrame()
    await expect(frame.getByText('Doces feitos à mão')).toBeVisible({ timeout: 30_000 })
  })

  for (const theme of ['light', 'dark'] as const) {
    for (const path of [
      '/admin',
      '/admin/paginas',
      '/admin/configuracoes',
      '/admin/menu-e-rodape',
    ]) {
      test(`axe sem "serious" em ${path} (${theme === 'light' ? 'claro' : 'escuro'})`, async () => {
        await page.context().addCookies([{ name: 'payload-theme', value: theme, url: BASE }])
        await open(page, path)
        expect(await seriousViolations(page)).toEqual([])
        await page.screenshot({
          path: test.info().outputPath(`${path.replace(/\W+/g, '-')}-${theme}.png`),
          fullPage: true,
        })
      })
    }
  }

  test('editor: escolhas visuais nas cores do site e seção escolhida em anil', async () => {
    await page.context().addCookies([{ name: 'payload-theme', value: 'light', url: BASE }])
    await open(page, `/admin/editor/${homeId}`)
    const preview = page.frameLocator('.ed-root iframe').first()
    await preview.locator('[data-puck-component="TextImage-p"]').click()

    const side = page.getByRole('radiogroup', { name: 'Lado da foto' })
    await expect(side.getByRole('radio')).toHaveCount(2)
    await expect(side.getByRole('radio', { name: 'Direita' })).toBeChecked()
    await side.getByRole('radio', { name: 'Esquerda' }).click()
    await expect(side.getByRole('radio', { name: 'Esquerda' })).toBeChecked()
    await expect(page.getByRole('radiogroup', { name: 'Fundo' }).getByRole('radio')).toHaveCount(3)

    const siteColor = await page
      .locator('.ed-root')
      .evaluate((root) => getComputedStyle(root).getPropertyValue('--ed-site-primary').trim())
    expect(siteColor).toBe('#a0306a')

    expect(await seriousViolations(page)).toEqual([])
    await page.screenshot({ path: test.info().outputPath('editor-opcoes.png') })
  })

  test('editor: lista de seções com o selo "novo" sem cortar o nome', async () => {
    await page.locator('[class*="NavItem-link"]').first().click()
    const item = page.locator('.ed-palitem:not([inert])', { hasText: 'Vitrine de produtos' })
    await expect(item.locator('.ed-new')).toHaveText('novo')
    const name = item.locator('.ed-palitem__name b')
    const clipped = await name.evaluate((element) => element.scrollWidth > element.clientWidth)
    expect(clipped).toBe(false)
    await page.screenshot({ path: test.info().outputPath('editor-secoes.png') })
  })

  test('editor: trocar a personalidade muda a prévia e guarda no rascunho', async () => {
    await page.getByLabel('Personalidade').selectOption('aconchego')
    const preview = page.frameLocator('.ed-root iframe').first()
    await expect(preview.locator('body')).toHaveAttribute('data-personality', 'aconchego')
    await expect(page.getByText(/Personalidade Aconchego guardada/)).toBeVisible()

    const payload = await panel()
    const draft = await payload.findGlobal({
      slug: 'site',
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    expect(draft.personality).toBe('aconchego')
    expect(draft.name).toBe('Doces da Ana')
    const live = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(live.personality).toBe('classico')
  })
})
