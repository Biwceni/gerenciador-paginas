import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Entrega 1 do teste de estresse: salvar sem perder trabalho. O erro de salvar diz o campo e a
// seção, a mudança que não foi salva fica guardada no aparelho e volta ao abrir de novo, e a página
// não fica sem nome.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: number[] = []
let pageCount = 0

const hero = {
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title: 'Página de teste',
    text: 'Texto curto.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
}

async function createPage() {
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Teste de salvar',
      slug: `salvar-${SUFFIX}-${++pageCount}`,
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content: [hero] } },
      _status: 'draft',
    },
    draft: true,
    overrideAccess: true,
  })
  created.push(doc.id)
  return doc.id
}

async function saved(id: number) {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: 'pages',
    id,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  return doc as unknown as {
    title: string
    content: { data: { content: { props: Record<string, unknown> }[] } }
  }
}

/** Põe o título do banner de volta no banco, como se nada tivesse sido salvo. */
async function restoreTitle(id: number, title: string) {
  const payload = await getPayload({ config })
  const doc = await saved(id)
  const content = structuredClone(doc.content) as {
    data: { content: { props: Record<string, unknown> }[] }
  }
  content.data.content[0].props.title = title
  await payload.update({
    collection: 'pages',
    id,
    data: { content } as never,
    draft: true,
    overrideAccess: true,
  })
}

const preview = (page: Page) => page.frameLocator('iframe').first()
const sections = (page: Page) =>
  preview(page).locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')
const fields = (page: Page) => page.locator('form[class*="_PuckFields_"]:visible')

async function open(page: Page, id: number) {
  await page.goto(`${BASE}/admin/editor/${id}`)
  await expect(sections(page)).toHaveCount(1, { timeout: 180_000 })
  await page.waitForTimeout(1500)
}

async function pickHero(page: Page) {
  await sections(page)
    .first()
    .click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(800)
}

test.describe('editor: salvar sem perder trabalho', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.endsWith('/login'))
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

  test('texto longo: o campo conta, e o aviso diz o campo e a seção, com Ir até o campo', async ({
    page,
  }) => {
    const id = await createPage()
    await open(page, id)
    await pickHero(page)
    const title = fields(page).locator('input[type="text"]').first()
    await expect(fields(page)).toContainText('15 de 120')
    await title.fill('x'.repeat(125))
    await expect(fields(page)).toContainText('125 de 120. Passou 5: encurte para salvar.')
    await expect(title).toHaveAttribute('aria-invalid', 'true')

    const alert = page.locator('.ed-save-alert')
    await expect(alert).toContainText(
      '"Título" em Banner principal passou do limite de 120 letras. Encurte para salvar.',
      { timeout: 10_000 },
    )
    // Tirando a escolha da seção, o Ir até o campo volta para ela.
    await page.keyboard.press('Escape')
    await alert.getByRole('button', { name: 'Ir até o campo' }).click()
    await expect(fields(page).locator('input[type="text"]').first()).toHaveValue('x'.repeat(125))
    expect((await saved(id)).content.data.content[0].props.title).toBe('Página de teste')

    await fields(page).locator('input[type="text"]').first().fill('Título certo')
    await expect(alert).toHaveCount(0, { timeout: 10_000 })
    await expect
      .poll(async () => (await saved(id)).content.data.content[0].props.title, { timeout: 15_000 })
      .toBe('Título certo')
  })

  test('saiu sem salvar: a mudança fica no aparelho e volta ao abrir de novo', async ({
    page: first,
    context,
  }) => {
    let page = first
    const id = await createPage()
    await open(page, id)
    await pickHero(page)
    await context.setOffline(true)
    await fields(page).locator('input[type="text"]').first().fill('Feito sem internet')
    await expect(page.locator('.ed-top__status')).toHaveAttribute('aria-label', /Sem internet/, {
      timeout: 10_000,
    })
    await page.getByRole('link', { name: 'Voltar para as páginas' }).click()
    const leave = page.getByRole('alertdialog')
    await expect(leave).toContainText('Você está sem internet.')
    await expect(leave).toContainText('ficam guardadas só neste aparelho')
    // A cópia já está no aparelho, antes mesmo de sair.
    const copy = await page.evaluate((key) => localStorage.getItem(key), `gp-editor-copia-${id}`)
    expect(JSON.parse(copy ?? '{}').data?.content?.[0]?.props?.title).toBe('Feito sem internet')
    await leave.getByRole('button', { name: 'Sair mesmo assim' }).click()
    await expect(page).not.toHaveURL(/\/admin\/editor\//, { timeout: 30_000 })
    // O modo sem internet do Playwright vale para a aba, e a aba que está saindo escapa dele (um
    // salvar atrasado chega ao servidor). Para a volta não depender disso, a cópia é posta de novo,
    // como estava, numa aba nova.
    await page.close()
    await context.setOffline(false)
    page = await context.newPage()
    await page.goto(`${BASE}/admin/login`)
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`gp-editor-copia-${id}`, copy ?? ''],
    )
    await restoreTitle(id, 'Página de teste')

    await open(page, id)
    const recover = page.getByRole('alertdialog')
    await expect(recover).toContainText('Há mudanças que não foram salvas')
    await recover.getByRole('button', { name: 'Recuperar as mudanças' }).click()
    await expect(preview(page).getByText('Feito sem internet')).toBeVisible()
    await expect
      .poll(async () => (await saved(id)).content.data.content[0].props.title, { timeout: 15_000 })
      .toBe('Feito sem internet')
    // Salvo, a cópia do aparelho sai: abrir de novo não pergunta mais.
    await open(page, id)
    await expect(page.getByRole('alertdialog')).toHaveCount(0)
  })

  test('Página e Google não salva com o nome da página vazio', async ({ page }) => {
    const id = await createPage()
    await open(page, id)
    await page.getByRole('button', { name: 'Página e Google' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Nome da página').fill('')
    await expect(dialog).toContainText('Obrigatório: aparece no menu e no Google.')
    await dialog.getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog).toContainText('Escreva o nome da página para salvar.')
    await expect(dialog).toBeVisible()
    expect((await saved(id)).title).toBe('Teste de salvar')
  })
})
