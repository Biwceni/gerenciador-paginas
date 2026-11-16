import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Melhorias inspiradas no Elementor, etapa 3 (decisões de 2026-11-15): Minhas seções (E2), a seção
// "Números do negócio" (E10) e o botão direito com a lista de atalhos (E6). No banco de
// TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: number[] = []
let pageCount = 0

const hero = (id: string, title = 'Página de teste', extra: Record<string, unknown> = {}) => ({
  type: 'Hero',
  props: {
    id,
    menuLabel: '',
    title,
    text: 'Texto curto.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
    ...extra,
  },
})

const richText = (id: string, title: string) => ({
  type: 'RichText',
  props: { id, menuLabel: '', title, body: '<p>Parágrafo.</p>', style: 'light', anim: 'site' },
})

const stats = (id: string) => ({
  type: 'Stats',
  props: {
    id,
    menuLabel: '',
    title: 'Em números',
    items: [
      { value: '+500', text: 'clientes atendidos' },
      { value: '4,9', text: 'de nota no Google' },
      { value: '', text: '' },
    ],
    style: 'soft',
    anim: 'cascata',
  },
})

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(content: unknown[], status: 'draft' | 'published' = 'draft') {
  const payload = await getPayload({ config })
  const slug = `elementor3-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title: `Etapa 3 ${pageCount}`, slug, content: wrap(content), _status: status },
    draft: status === 'draft',
    overrideAccess: true,
  })
  created.push(doc.id)
  return { id: doc.id, slug }
}

type Saved = { type: string; props: Record<string, unknown> & { id: string } }

async function savedContent(id: number): Promise<Saved[]> {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: 'pages',
    id,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  return (doc.content as { data: { content: Saved[] } }).data.content
}

async function clearSaved() {
  const payload = await getPayload({ config })
  await payload.delete({ collection: 'saved-sections', where: {}, overrideAccess: true })
}

async function storeSaved(name: string, item: unknown) {
  const payload = await getPayload({ config })
  return payload.create({
    collection: 'saved-sections',
    data: { name, section: { kind: 'gp-section', version: CONTENT_VERSION, item } },
    overrideAccess: true,
  })
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

const preview = (page: Page) => page.frameLocator('.ed-root iframe').first()
const sections = (page: Page) =>
  preview(page).locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')

async function openEditor(page: Page, id: number, count: number) {
  await page.goto(`${BASE}/admin/editor/${id}`)
  await expect(sections(page)).toHaveCount(count, { timeout: 180_000 })
  await page.waitForTimeout(1500)
}

async function pick(page: Page, target: ReturnType<typeof sections>) {
  await target.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await target.click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(800)
}

async function waitSaved(id: number, check: (content: Saved[]) => boolean) {
  await expect.poll(async () => check(await savedContent(id)), { timeout: 20_000 }).toBe(true)
}

async function noSideScroll(page: Page) {
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(wide).toBe(false)
}

async function openCatalog(page: Page) {
  // No celular o botão da barra diz só "Adicionar".
  await page
    .getByRole('button', { name: /^Adicionar( seção)?$/ })
    .first()
    .click()
  await expect(page.locator('.ed-saved')).toBeVisible()
}

test.describe('editor: melhorias do Elementor, etapa 3', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.beforeEach(async () => {
    await clearSaved()
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
    await clearSaved()
    await cleanupTestUser()
  })

  test('E2 guardar pelo ⋯ e usar em outra página, com identificação nova', async ({ page }) => {
    const source = await createPage([hero('Hero-a1', 'Bolos por encomenda')])
    const target = await createPage([richText('RichText-b1', 'Outra página')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, source.id, 1)

    await pick(page, sections(page).first())
    await preview(page).getByRole('button', { name: 'Mais ações' }).click()
    const menu = preview(page).getByRole('menu', { name: 'Mais ações' })
    await expect(menu.getByText('Para usar sempre, em qualquer página e aparelho.')).toBeVisible()
    await menu.getByRole('menuitem', { name: /Guardar em Minhas seções/ }).click()

    const dialog = page.getByRole('dialog', { name: 'Guardar em Minhas seções' })
    await expect(dialog).toBeVisible()
    const name = dialog.getByRole('textbox', { name: /Nome/ })
    await expect(name).toHaveValue('Banner principal: Bolos por encomenda')
    await expect(dialog).toContainText('Guarda uma cópia')
    await name.fill('   ')
    await expect(dialog.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await name.fill('Banner de encomendas')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('“Banner de encomendas” guardada em Minhas seções')).toBeVisible()

    await openEditor(page, target.id, 1)
    await openCatalog(page)
    const mine = page.locator('.ed-saved')
    await expect(mine).toContainText('1 de 30')
    await mine.locator('.ed-saved__use', { hasText: 'Banner de encomendas' }).click()
    await expect(sections(page)).toHaveCount(2)
    await waitSaved(target.id, (content) => content.length === 2)
    const [, placed] = await savedContent(target.id)
    expect(placed.type).toBe('Hero')
    expect(placed.props.title).toBe('Bolos por encomenda')
    expect(placed.props.id).not.toBe('Hero-a1')
  })

  test('E2 renomear, ver como fica e apagar com Desfazer', async ({ page }) => {
    const { id } = await createPage([richText('RichText-a1', 'Página')])
    await storeSaved('Banner guardado', hero('Hero-s1', 'Título guardado'))
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await openCatalog(page)
    const mine = page.locator('.ed-saved')

    await mine.getByRole('button', { name: 'Mais ações de “Banner guardado”' }).click()
    await page.getByRole('menuitem', { name: 'Renomear' }).click()
    const rename = page.getByRole('dialog', { name: 'Renomear seção guardada' })
    await rename.getByRole('textbox').fill('Banner novo nome')
    await rename.getByRole('button', { name: /Renomear|Salvar|Guardar/ }).click()
    await expect(mine).toContainText('Banner novo nome')

    await mine.getByRole('button', { name: 'Mais ações de “Banner novo nome”' }).click()
    await page.getByRole('menuitem', { name: 'Ver como fica' }).click()
    const visitor = page.locator('.ed-visitor')
    await expect(visitor).toBeVisible()
    await expect(visitor).toContainText('Nada muda até você colocar')
    await expect(visitor.frameLocator('iframe').first().getByText('Título guardado')).toBeVisible({
      timeout: 30_000,
    })
    await page.keyboard.press('Escape')
    await expect(visitor).toBeHidden()
    await expect(sections(page)).toHaveCount(1)

    await mine.getByRole('button', { name: 'Mais ações de “Banner novo nome”' }).click()
    await page.getByRole('menuitem', { name: 'Apagar' }).click()
    await expect(mine).toContainText('0 de 30')
    await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Desfazer' }).click()
    await expect(mine).toContainText('Banner novo nome')
    await expect(mine).toContainText('1 de 30')
  })

  test('E2 limite de 30, foto apagada e nomes longos', async ({ page }) => {
    const { id } = await createPage([richText('RichText-a1', 'Página')])
    await storeSaved(
      'Banner com foto que não existe mais',
      hero('Hero-f1', 'Com foto', {
        image: { mediaId: 987654321 },
      }),
    )
    for (let index = 1; index < 30; index++) {
      await storeSaved(
        `Seção ${index} ${'nome comprido '.repeat(4)}`,
        richText(`R-${index}`, `T${index}`),
      )
    }
    // A 31ª é recusada pelo servidor, com a mensagem de limite.
    const refused = await storeSaved('A trigésima primeira', richText('R-31', 'T31')).then(
      () => null,
      (error: unknown) => error,
    )
    expect(JSON.stringify((refused as { data?: unknown } | null)?.data ?? refused)).toContain(
      '30 seções guardadas',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 1)
    await openCatalog(page)
    const mine = page.locator('.ed-saved')
    await expect(mine).toContainText('30 de 30')
    await noSideScroll(page)

    // Com muitas, a lista mostra as primeiras e "Ver todas" abre o resto.
    await expect(mine.locator('.ed-saved__use')).toHaveCount(4)
    await mine.getByRole('button', { name: 'Ver todas as 30' }).click()
    await expect(mine.locator('.ed-saved__use')).toHaveCount(30)
    await noSideScroll(page)
    await mine.locator('.ed-saved__use', { hasText: 'Banner com foto que não existe mais' }).click()
    await expect(sections(page)).toHaveCount(2)
    await waitSaved(id, (content) => content.length === 2)
    const placed = (await savedContent(id)).find((item) => item.type === 'Hero')
    expect(placed?.props.image).toBeNull()

    // Cheio: a janela de guardar avisa e não deixa guardar.
    await page.setViewportSize({ width: 1440, height: 900 })
    await pick(page, sections(page).first())
    await preview(page).getByRole('button', { name: 'Mais ações' }).click()
    await preview(page)
      .getByRole('menu', { name: 'Mais ações' })
      .getByRole('menuitem', { name: /Guardar em Minhas seções/ })
      .click()
    const dialog = page.getByRole('dialog', { name: 'Guardar em Minhas seções' })
    await expect(dialog).toContainText('30')
    await expect(dialog.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  test('E10 Números do negócio: entra pelo catálogo e conta no site até o número certo', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-a1')])
    const published = await createPage([hero('Hero-p1'), stats('Stats-p1')], 'published')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: 'Adicionar seção' }).first().click()
    await page
      .locator('.ed-palitem:not([inert])', { hasText: 'Números do negócio' })
      .first()
      .click()
    await expect(sections(page)).toHaveCount(2)
    const done = page.getByRole('button', { name: 'Pronto' })
    if (await done.isVisible().catch(() => false)) await done.click()
    await waitSaved(id, (content) => content.some((item) => item.type === 'Stats'))
    const added = (await savedContent(id)).find((item) => item.type === 'Stats')
    expect((added?.props.items as { value: string }[]).map((item) => item.value)).toEqual([
      '10',
      '+500',
      '4,9',
    ])
    await expect(sections(page).nth(1)).toContainText('clientes atendidos')

    await page.goto(`${BASE}/${published.slug}`)
    const values = page.locator('.stats__value')
    await expect(values).toHaveCount(2)
    await values.first().scrollIntoViewIfNeeded()
    await expect(values.first()).toHaveText('+500', { timeout: 10_000 })
    await expect(values.nth(1)).toHaveText('4,9')
    await page.setViewportSize({ width: 390, height: 844 })
    await noSideScroll(page)
  })

  test('E6 botão direito na seção abre as ações dela; "?" mostra os atalhos', async ({ page }) => {
    const { id } = await createPage([
      hero('Hero-a1', 'Primeira'),
      richText('RichText-a1', 'Segunda'),
    ])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)

    await sections(page)
      .nth(1)
      .click({ button: 'right', position: { x: 40, y: 20 } })
    const menu = page.getByRole('menu', { name: 'Ações da seção' })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Descer' })).toBeDisabled()
    await expect(menu.getByRole('menuitem', { name: 'Subir' })).toBeFocused()
    const box = await menu.boundingBox()
    expect(box && box.x + box.width <= 1440 && box.y + box.height <= 900).toBe(true)
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    await sections(page)
      .nth(1)
      .click({ button: 'right', position: { x: 40, y: 20 } })
    await menu.getByRole('menuitem', { name: 'Subir' }).click()
    await expect(menu).toBeHidden()
    await waitSaved(id, (content) => content[0]?.props.title === 'Segunda')

    await page.locator('body').press('?')
    const help = page.getByRole('dialog', { name: 'Atalhos do teclado' })
    await expect(help).toBeVisible()
    await expect(help).toContainText('Desfazer')
    await page.keyboard.press('Escape')
    await expect(help).toBeHidden()

    // Perto da borda de baixo, o menu abre para cima e não sai da tela.
    await page.setViewportSize({ width: 1280, height: 640 })
    await page.waitForTimeout(600)
    const last = sections(page).nth(1)
    await last.scrollIntoViewIfNeeded()
    const lastBox = await last.boundingBox()
    const frameBox = await page.locator('.ed-root iframe').boundingBox()
    if (lastBox && frameBox) {
      // Bem embaixo da parte visível da prévia.
      const bottom = Math.min(lastBox.y + lastBox.height, frameBox.y + frameBox.height, 640) - 12
      // Na margem da esquerda, fora do texto (no texto, o botão direito é do texto).
      await page.mouse.click(lastBox.x + 8, bottom, {
        button: 'right',
      })
      await expect(menu).toBeVisible()
      const placed = await menu.boundingBox()
      expect(placed && placed.y >= 0 && placed.y + placed.height <= 640).toBe(true)
      await page.mouse.click(5, 300)
      await expect(menu).toBeHidden()
    }
  })

  test('E6 no celular o botão direito não abre o menu do editor', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 1)
    await sections(page)
      .first()
      .click({ button: 'right', position: { x: 40, y: 20 } })
    await page.waitForTimeout(400)
    await expect(page.getByRole('menu', { name: 'Ações da seção' })).toHaveCount(0)
  })
})
