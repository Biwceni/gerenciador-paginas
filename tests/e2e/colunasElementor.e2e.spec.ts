import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'
import { openFieldTab } from '../helpers/editor'

// Colunas no estilo Elementor e Vídeo com Vimeo (decisões de 2026-11-15), no banco de
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

async function createPage(content: unknown[], published = false) {
  const payload = await getPayload({ config })
  const slug = `colunas-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Colunas',
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

const piece = (id: string, title: string) => ({
  type: 'ColumnText',
  props: { id, title, text: 'Texto curto.' },
})

const columns = (layout = 'half') => ({
  type: 'Columns',
  props: {
    id: 'Columns-c1',
    menuLabel: '',
    layout,
    column1: [piece('ColumnText-a1', 'Primeira A'), piece('ColumnText-a2', 'Primeira B')],
    column2: [piece('ColumnText-b1', 'Segunda A')],
    column3: [],
    column4: [],
    mobileOrder: 'first',
    align: 'start',
    style: 'light',
    anim: 'site',
  },
})

const column = (page: Page, n: number) =>
  preview(page).locator(`[data-puck-dropzone="Columns-c1:column${n}"] > [data-puck-component]`)

const savedColumn = async (id: number, index: number, n: number) =>
  ((await savedContent(id))[index].props[`column${n}`] as { props: { id: string } }[]).map(
    (item) => item.props.id,
  )

test.describe('editor: Colunas no estilo Elementor', () => {
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

  test('C3 colocar Colunas pergunta como dividir; Cancelar tira a seção', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.locator('[class*="NavItem-link"]', { hasText: 'Adicionar' }).first().click()
    const item = page.locator('.ed-palitem:not([inert])', {
      has: page.locator('.ed-palitem__name', { hasText: /^Colunas$/ }),
    })
    await item.first().click()
    const dialog = page.getByRole('dialog', { name: 'Como dividir as colunas?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('radio', { name: 'Duas iguais' })).toBeChecked()
    await dialog.getByRole('radio', { name: 'Quatro iguais' }).check()
    await dialog.getByRole('button', { name: 'Colocar na página' }).click()
    await expect(sections(page)).toHaveCount(2)
    await expect
      .poll(async () => (await savedContent(id))[1]?.props.layout, { timeout: 15_000 })
      .toBe('fourths')

    await item.first().click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(sections(page)).toHaveCount(2)
    await expect(page.getByText('Seção removida.')).toHaveCount(0)
  })

  test('C1 selos e "+ Peça nesta coluna" com a seção escolhida', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), columns()])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await expect(preview(page).locator('.columns__tag')).toHaveCount(0)
    await pick(page, sections(page).nth(1))
    await expect(preview(page).locator('.columns__tag')).toHaveText([/^Coluna 1/, /^Coluna 2/])
    const add = preview(page).getByRole('button', { name: '+ Peça nesta coluna', exact: true })
    await expect(add).toHaveCount(2)
    await add.nth(1).click()
    await preview(page).getByRole('button', { name: 'Texto', exact: true }).click()
    await expect(column(page, 2)).toHaveCount(2)
    await expect.poll(async () => (await savedColumn(id, 1, 2)).length, { timeout: 15_000 }).toBe(2)
  })

  test('C5 no celular, o selo diz onde a coluna fica no computador', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), columns()])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    await expect(preview(page).locator('.columns__tag').first()).toHaveText(
      'Coluna 1 · no computador, à esquerda',
    )
  })

  test('C2 a peça vai para a coluna vizinha pela barrinha, com Desfazer', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), columns()])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    await pick(page, column(page, 1).first())
    await preview(page).getByRole('button', { name: 'Levar para a Coluna 2' }).click()
    await expect(page.getByText('A peça foi para a Coluna 2.')).toBeVisible()
    await expect(column(page, 2)).toHaveCount(2)
    await expect
      .poll(() => savedColumn(id, 1, 2), { timeout: 15_000 })
      .toEqual(['ColumnText-b1', 'ColumnText-a1'])
  })

  test('C9 a Ordem mostra as peças de cada coluna e muda de coluna', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), columns()])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await page.locator('[class*="NavItem-link"]', { hasText: 'Ordem' }).first().click()
    const tree = page.locator('.ed-order__tree')
    await expect(tree).toContainText('Coluna 1')
    await expect(tree).toContainText('Primeira B')
    await tree
      .locator('.ed-order__col', { hasText: 'Coluna 2' })
      .getByRole('button', { name: 'Levar para a Coluna 1' })
      .click()
    await expect
      .poll(() => savedColumn(id, 1, 1), { timeout: 15_000 })
      .toEqual(['ColumnText-a1', 'ColumnText-a2', 'ColumnText-b1'])
  })

  test('C6, C7 e C8 Quatro iguais, a última primeiro no celular e alinhadas no meio', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-a1'), columns()])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    await openFieldTab(page, 'Aparência')
    await fields(page).locator('label', { hasText: 'Quatro iguais' }).first().click()
    await fields(page).getByText('A última', { exact: true }).click()
    await fields(page).getByText('No meio', { exact: true }).click()
    await expect
      .poll(
        async () => {
          const props = (await savedContent(id))[1].props
          return [props.layout, props.mobileOrder, props.align]
        },
        { timeout: 15_000 },
      )
      .toEqual(['fourths', 'last', 'center'])
    const grid = preview(page).locator('.columns')
    await expect(grid).toHaveClass(/columns--fourths/)
    await expect(grid).toHaveClass(/columns--mobile-last/)
    await expect(grid).toHaveClass(/columns--align-center/)
    await expect(preview(page).locator('.columns__column')).toHaveCount(4)
  })

  test('V1 o Vídeo aceita o link do Vimeo', async ({ page }) => {
    const video = {
      type: 'Video',
      props: {
        id: 'Video-v1',
        menuLabel: '',
        title: 'Assista',
        videoId: '',
        caption: '',
        cover: null,
        style: 'light',
        anim: 'site',
      },
    }
    const { id } = await createPage([hero('Hero-a1'), video])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    // O Vimeo responde com o nome do arquivo: comprido e sem espaços (achado do Fábio).
    const longName = `Video_${'muito_comprido_'.repeat(12)}720p.mp4`
    await page.route('**/vimeo.com/api/oembed.json**', (route) =>
      route.fulfill({ json: { title: longName, thumbnail_url: null } }),
    )
    await pick(page, sections(page).nth(1))
    const address = fields(page).getByPlaceholder('Cole o link do YouTube ou do Vimeo')
    await address.fill('https://vimeo.com/603509817?fl=ip&fe=ec')
    await expect(fields(page)).toContainText('O Vimeo só é carregado quando o visitante clica')
    await expect(fields(page)).toContainText('Vídeo: Video_muito_comprido_')
    // O painel não anda para o lado: nada entre o formulário e a página fica mais largo que a caixa.
    const wide = await fields(page).evaluate((form) => {
      const out: string[] = []
      for (let node: HTMLElement | null = form as HTMLElement; node; node = node.parentElement) {
        if (node.scrollWidth > node.clientWidth + 1) out.push(node.className || node.tagName)
      }
      return out
    })
    expect(wide).toEqual([])
    await expect
      .poll(async () => (await savedContent(id))[1].props.videoId, { timeout: 15_000 })
      .toBe('vimeo:603509817')
    await address.fill('https://exemplo.com/video')
    await expect(fields(page)).toContainText('não é de um vídeo do YouTube nem do Vimeo')
  })
})
