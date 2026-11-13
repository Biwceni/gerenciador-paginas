import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Achados do teste de estresse do editor (rodadas 1 a 13) que fazem perder trabalho ou são graves,
// no banco de TEST_DATABASE_URL. `test.fail()` marca o que ainda está errado: o teste passa
// enquanto o bug existe e começa a falhar quando a correção chega. Quem corrigir tira a marcação.

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

const piece = (id: string, title: string) => ({
  type: 'ColumnText',
  props: { id, title, text: 'Texto curto.' },
})

/** Colunas com 6 peças na primeira coluna, o máximo que o sistema salva. */
const fullColumns = {
  type: 'Columns',
  props: {
    id: 'Columns-c1',
    menuLabel: '',
    layout: 'half',
    column1: [1, 2, 3, 4, 5, 6].map((n) => piece(`ColumnText-p${n}`, `Peça ${n}`)),
    column2: [piece('ColumnText-q1', 'Outra coluna')],
    column3: [],
    style: 'light',
    anim: 'site',
  },
}

async function createPage(content: unknown[], published = false) {
  const payload = await getPayload({ config })
  const slug = `estresse-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Teste de estresse',
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

// Sem `serial`: cada teste cria a própria página, e um que falha não impede os outros de rodar.
test.describe('editor: achados do teste de estresse', () => {
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

  test('13.1 coluna cheia: Duplicar fica desligado na 6ª peça', async ({ page }) => {
    test.fail()
    const { id } = await createPage([hero('Hero-a1'), fullColumns])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(
      page,
      preview(page).locator('[data-puck-dropzone$=":column1"] > [data-puck-component]').nth(5),
    )
    await expect(fields(page).getByRole('button', { name: 'Duplicar' })).toBeDisabled({
      timeout: 5_000,
    })
  })

  test('13.7 página com 100 seções: Duplicar fica desligado', async ({ page }) => {
    test.fail()
    test.setTimeout(300_000)
    const content = Array.from({ length: 100 }, (_, i) => cta(i + 1))
    const { id } = await createPage(content)
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 100)
    await pick(page, sections(page).nth(99))
    await expect(fields(page).getByRole('button', { name: 'Duplicar' })).toBeDisabled({
      timeout: 5_000,
    })
  })

  test('11.2 campo com limite mostra quantas letras faltam', async ({ page }) => {
    test.fail()
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, sections(page).first())
    await expect(fields(page)).toContainText(/\d+ de 120/, { timeout: 5_000 })
  })

  test('1.2 sem internet: a mudança é salva sozinha quando a conexão volta', async ({
    page,
    context,
  }) => {
    test.fail()
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, sections(page).first())
    await context.setOffline(true)
    await fields(page).locator('input[type="text"]').first().fill('Título feito sem internet')
    await page.waitForTimeout(4_000)
    await context.setOffline(false)
    await expect
      .poll(async () => (await savedContent(id))[0].props.title, { timeout: 20_000 })
      .toBe('Título feito sem internet')
  })

  test('13.4 Voltar com mudança não salva pergunta dentro do editor', async ({ page, context }) => {
    test.fail()
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, sections(page).first())
    await context.setOffline(true)
    await fields(page).locator('input[type="text"]').first().fill('Mudança que não foi salva')
    await page.waitForTimeout(4_000)
    // O aviso genérico do navegador não conta: ele é recusado, e o editor precisa explicar sozinho.
    page.on('dialog', (dialog) => void dialog.dismiss())
    await page.getByRole('link', { name: 'Voltar para as páginas' }).click()
    await expect(page.getByRole('dialog').or(page.getByRole('alertdialog'))).toContainText(
      /não (foram|foi) salv/i,
      { timeout: 5_000 },
    )
    await context.setOffline(false)
  })

  test('8.1 no celular, tocar numa peça coloca dentro das Colunas', async ({ page }) => {
    test.fail()
    const { id } = await createPage([hero('Hero-a1'), fullColumns])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    await page.locator('[class*="NavItem-link"]', { hasText: 'Adicionar' }).first().click()
    await page.waitForTimeout(800)
    const photo = page.locator('.ed-palitem:not([inert])', {
      has: page.locator('.ed-palitem__name', { hasText: /^Foto$/ }),
    })
    await photo.first().scrollIntoViewIfNeeded()
    await photo.first().click()
    await expect(page.getByText(/em qual coluna/i)).toBeVisible({ timeout: 5_000 })
  })

  test('9.1 a biblioteca de fotos abre por cima de Página e Google', async ({ page }) => {
    test.fail()
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: 'Página e Google' }).first().click()
    await page.getByRole('button', { name: 'Escolher foto' }).first().click()
    const title = page.getByText('Escolha uma foto', { exact: true })
    await expect(title).toBeVisible({ timeout: 10_000 })
    // O ponto no meio do título da biblioteca precisa ser da biblioteca, e não da janela de baixo.
    const box = await title.boundingBox()
    if (!box) throw new Error('título fora da tela')
    const onTop = await title.evaluate(
      (element, point) => {
        const hit = document.elementFromPoint(point.x, point.y)
        return Boolean(hit && (element.contains(hit) || hit.contains(element)))
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    )
    expect(onTop).toBe(true)
  })

  test('3.1 e 10.1 palavra comprida cabe na tela do celular, no site publicado', async ({
    page,
  }) => {
    test.fail()
    const { slug } = await createPage(
      [hero('Hero-a1', '@confeitariaartesanalmrskluanasantoandresp')],
      true,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/${slug}`)
    const title = page.locator('h1')
    await expect(title).toBeVisible({ timeout: 120_000 })
    // O site pode esconder a rolagem para o lado: o que conta é o título passar da tela ou da
    // própria caixa, cortado.
    const overflow = await title.evaluate((element) =>
      Math.max(
        element.scrollWidth - element.clientWidth,
        element.getBoundingClientRect().right - window.innerWidth,
        document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
