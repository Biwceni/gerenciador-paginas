import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'
import { openFieldTab } from '../helpers/editor'

// Rodada 2 da jornada do editor (avaliação de 2026-11-15): os ajustes aprovados, no banco de
// TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: number[] = []
let pageCount = 0

const hero = (id: string, title = 'Página de teste') => ({
  type: 'Hero',
  props: {
    id,
    title,
    text: 'Texto curto.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
})

const cta = (n: number) => ({
  type: 'CallToAction',
  props: {
    id: `CallToAction-${n}`,
    menuLabel: '',
    title: `Seção ${n}`,
    text: 'Texto curto.',
    button: null,
    style: 'light',
    anim: 'site',
  },
})

async function createPage(content: unknown[], published = false) {
  const payload = await getPayload({ config })
  const slug = `rodada2-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Rodada 2',
      slug,
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content } },
      _status: published ? 'published' : 'draft',
    },
    draft: !published,
    overrideAccess: true,
  })
  created.push(doc.id)
  return { id: doc.id, slug }
}

async function savedContent(id: number) {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: 'pages',
    id,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  return (doc.content as { data: { content: { props: Record<string, unknown> }[] } }).data.content
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

const preview = (page: Page) => page.frameLocator('iframe').first()
const sections = (page: Page) =>
  preview(page).locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')
const fields = (page: Page) => page.locator('form[class*="_PuckFields_"]:visible')

async function openEditor(page: Page, id: number, count: number) {
  await page.goto(`${BASE}/admin/editor/${id}`)
  await expect(sections(page)).toHaveCount(count, { timeout: 180_000 })
  await page.waitForTimeout(1500)
}

/** Escolhe uma seção ou peça clicando no canto dela, onde não tem texto. */
async function pick(page: Page, target: ReturnType<typeof sections>) {
  await target.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await target.click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(800)
}

const linkHero = (id: string, link: unknown) => ({
  ...hero(id),
  props: { ...hero(id).props, button: { label: 'Saiba mais', link } },
})

const named = (n: number, menuLabel: string) => ({
  ...cta(n),
  props: { ...cta(n).props, menuLabel },
})

test.describe('editor: rodada 2 da jornada', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterEach(async () => {
    const payload = await getPayload({ config })
    for (const id of created.splice(0)) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('F1 no celular, as Opções mostram a seção escolhida desde o topo, sem a barrinha', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-a1'), cta(1), cta(2), cta(3)])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 4)
    await pick(page, sections(page).nth(2))
    await page.locator('[class*="NavItem-link"]', { hasText: 'Opções' }).first().click()
    await page.waitForTimeout(1200)
    const frame = page.frames().find((item) => item !== page.mainFrame())!
    const state = await frame.evaluate(() => {
      const section = document.querySelector('[data-puck-component="CallToAction-2"]')!
      const bar = document.querySelector<HTMLElement>(
        "[class*='DraggableComponent-actionsOverlay']",
      )
      return {
        flag: document.documentElement.hasAttribute('data-ed-options'),
        // `+ 0` tira o -0 (Math.round de -0,3), que o toEqual separa do 0.
        top: Math.round(section.getBoundingClientRect().top) + 0,
        bar: bar ? getComputedStyle(bar).display : 'none',
      }
    })
    expect(state).toEqual({ flag: true, top: 0, bar: 'none' })
  })

  test('F4 e F14 no computador, as três abas cabem e "Abrir Sua marca" é um botão', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-a1'), cta(1)])
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    const tablist = page.locator('[data-puck-tablist]:visible')
    const fits = await tablist.evaluate((list) => list.scrollWidth <= list.clientWidth + 1)
    expect(fits).toBe(true)
    const animacao = tablist.getByRole('tab', { name: 'Animação' })
    const box = (await animacao.boundingBox())!
    const listBox = (await tablist.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(listBox.x + listBox.width + 1)
    await openFieldTab(page, 'Animação')
    const brand = fields(page).getByRole('link', { name: /Abrir Sua marca/ })
    await expect(brand).toBeVisible()
    expect((await brand.boundingBox())!.height).toBeGreaterThanOrEqual(32)
  })

  test('F5 página com seções abre sem o catálogo; página vazia abre com ele', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    const empty = await createPage([])
    await page.setViewportSize({ width: 1280, height: 800 })
    await signIn(page)
    await openEditor(page, id, 1)
    await expect(page.locator('.ed-palitem:not([inert])').first()).toBeHidden()
    await expect(page.getByText(/reduzido para caber \(7\d%\)/)).toBeVisible()
    await page.goto(`${BASE}/admin/editor/${empty.id}`)
    await expect(page.locator('.ed-palitem:not([inert])').first()).toBeVisible({
      timeout: 180_000,
    })
  })

  test('F9 "Colocar no menu" fica junto dos botões do Publicar', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const foot = page.locator('.ed-dialog__foot')
    await expect(foot.getByRole('checkbox', { name: /Colocar esta página no menu/ })).toBeVisible()
    await expect(foot.getByRole('button', { name: /Publicar/ })).toBeVisible()
  })

  test('F11 "Leva para" em dois passos: a página e, se quiser, a seção', async ({ page }) => {
    const { id } = await createPage([
      linkHero('Hero-a1', { kind: 'whatsapp' }),
      named(1, 'Serviços'),
      named(2, 'Contato'),
    ])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 3)
    await pick(page, sections(page).first())
    const pageStep = fields(page).locator('.ed-link-field select').first()
    await expect(fields(page).getByLabel('Seção da página')).toHaveCount(0)
    await pageStep.selectOption(`page:${id}`)
    const sectionStep = fields(page).getByLabel('Seção da página')
    await expect(sectionStep.locator('option')).toHaveText([
      'Topo da página',
      'Serviços',
      'Contato',
    ])
    await sectionStep.selectOption({ label: 'Contato' })
    await expect
      .poll(async () => ((await savedContent(id))[0].props.button as { link: unknown }).link, {
        timeout: 15_000,
      })
      .toEqual({ kind: 'section', pageId: id, sectionId: 'CallToAction-2' })
  })

  test('F7 na tela de toque, a Ordem diz "Toque"', async ({ browser }) => {
    const { id } = await createPage([hero('Hero-a1'), cta(1)])
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    const page = await context.newPage()
    await signIn(page)
    await openEditor(page, id, 2)
    await page.locator('[class*="NavItem-link"]', { hasText: 'Ordem' }).first().click()
    const hint = page.locator('.ed-order .ed-hint').first()
    await expect(hint.locator('.ed-touch')).toBeVisible()
    await expect(hint.locator('.ed-mouse')).toBeHidden()
    await expect(hint).toContainText('para ir até a seção')
    await context.close()
  })
})
