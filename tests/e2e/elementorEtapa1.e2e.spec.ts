import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Melhorias inspiradas no Elementor, etapa 1 (decisões de 2026-11-15): textos do catálogo (E12),
// tablet (E11), "+ Adicionar seção aqui" (E4), copiar e colar seção (E1) e "Ver como visitante"
// (E5). No banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: number[] = []
let pageCount = 0

const hero = (id: string, title = 'Página de teste', menuLabel = '') => ({
  type: 'Hero',
  props: {
    id,
    menuLabel,
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

const cta = (id: string, title: string, button: unknown = null) => ({
  type: 'CallToAction',
  props: { id, menuLabel: '', title, text: 'Frase.', button, style: 'brand', anim: 'site' },
})

const richText = (id: string, title: string, menuLabel = '') => ({
  type: 'RichText',
  props: { id, menuLabel, title, body: '<p>Parágrafo.</p>', style: 'light', anim: 'site' },
})

const piece = (id: string, title: string) => ({
  type: 'ColumnText',
  props: { id, title, text: 'Texto curto.' },
})

const columns = () => ({
  type: 'Columns',
  props: {
    id: 'Columns-c1',
    menuLabel: '',
    layout: 'half',
    column1: [piece('ColumnText-a1', 'Primeira A')],
    column2: [piece('ColumnText-b1', 'Segunda A')],
    column3: [],
    column4: [],
    mobileOrder: 'first',
    align: 'start',
    style: 'light',
    anim: 'site',
  },
})

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(content: unknown[]) {
  const payload = await getPayload({ config })
  const slug = `elementor-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title: `Etapa 1 ${pageCount}`, slug, content: wrap(content), _status: 'draft' },
    draft: true,
    overrideAccess: true,
  })
  created.push(doc.id)
  return { id: doc.id, slug }
}

async function setContent(id: number, content: unknown[]) {
  const payload = await getPayload({ config })
  await payload.update({
    collection: 'pages',
    id,
    data: { content: wrap(content) },
    draft: true,
    overrideAccess: true,
  })
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

/** Espera o salvamento automático chegar ao banco. */
async function waitSaved(id: number, check: (content: Saved[]) => boolean) {
  await expect.poll(async () => check(await savedContent(id)), { timeout: 20_000 }).toBe(true)
}

/** Nada da tela mais largo que a janela (o painel e a prévia não andam para o lado). */
async function noSideScroll(page: Page) {
  const wide = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  expect(wide).toBe(false)
}

test.describe('editor: melhorias do Elementor, etapa 1', () => {
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

  test('E12 textos do catálogo e E11 botão Tablet na prévia', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)

    const list = page.locator('.ed-panel')
    await expect(list).toContainText('WhatsApp, telefone, e-mail, endereço e horário')
    await expect(list).toContainText('De duas a quatro colunas com título, texto, foto ou botão')
    await expect(list).not.toContainText('mapa do site')

    await page.getByRole('button', { name: 'Ver como tablet' }).click()
    await expect(page.getByRole('button', { name: 'Ver como tablet' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'Ver como computador' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(page.locator('.ed-canvasbar')).toContainText('Tablet')
    // A prévia desenha a página com 768 px de largura.
    await expect
      .poll(() =>
        preview(page)
          .locator('body')
          .evaluate(() => window.innerWidth),
      )
      .toBe(768)
    await page.getByRole('button', { name: 'Ver como computador' }).click()
    await expect(page.locator('.ed-canvasbar')).toContainText('Computador')
  })

  test('E4 "+ Adicionar seção aqui" coloca a seção no fim da página', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), richText('RichText-a1', 'Meio')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)

    // Com a primeira escolhida, a lista colocaria abaixo dela; o botão do fim leva para o fim.
    await pick(page, sections(page).first())
    const add = preview(page).getByRole('button', { name: 'Adicionar seção aqui' })
    await add.scrollIntoViewIfNeeded()
    await add.click()
    await expect(page.locator('.ed-panel')).toContainText('no fim da página')
    await page.locator('.ed-palitem:not([inert])', { hasText: 'Chamada para ação' }).first().click()
    await expect(sections(page)).toHaveCount(3)
    await waitSaved(id, (content) => content.length === 3)
    expect((await savedContent(id)).map((item) => item.type)).toEqual([
      'Hero',
      'RichText',
      'CallToAction',
    ])
  })

  test('E1 copiar pela barra ⋯ e colar em outra página, com identificação nova', async ({
    page,
  }) => {
    const source = await createPage([hero('Hero-a1'), columns()])
    const target = await createPage([hero('Hero-b1', 'Outra página')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, source.id, 2)

    await pick(page, sections(page).nth(1))
    await preview(page).getByRole('button', { name: 'Mais ações' }).click()
    const menu = preview(page).getByRole('menu', { name: 'Mais ações' })
    await expect(menu).toBeVisible()
    await menu.getByRole('menuitem', { name: /Copiar seção/ }).click()
    await expect(menu).toBeHidden()
    await expect(page.getByText('“Colunas” copiada')).toBeVisible()

    await openEditor(page, target.id, 1)
    await page.getByRole('button', { name: 'Adicionar seção' }).first().click()
    const card = page.locator('.ed-paste')
    await expect(card).toContainText('Seção copiada')
    await expect(card).toContainText('Colunas')
    await card.getByRole('button', { name: 'Colar' }).click()
    await expect(sections(page)).toHaveCount(2)
    await waitSaved(target.id, (content) => content.length === 2)

    const [, pasted] = await savedContent(target.id)
    expect(pasted.type).toBe('Columns')
    expect(pasted.props.id).not.toBe('Columns-c1')
    const pieces = [...(pasted.props.column1 as Saved[]), ...(pasted.props.column2 as Saved[])]
    expect(pieces.map((item) => item.props.title)).toEqual(['Primeira A', 'Segunda A'])
    expect(pieces.map((item) => item.props.id)).not.toContain('ColumnText-a1')
    expect(pieces.map((item) => item.props.id)).not.toContain('ColumnText-b1')
  })

  test('E1 Ctrl+C e Ctrl+V com a seção escolhida; no texto, são do texto', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), richText('RichText-a1', 'Copiável')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)

    await pick(page, sections(page).nth(1))
    await page.keyboard.press('Control+c')
    await expect(page.getByText('“Texto simples” copiada')).toBeVisible()
    await page.keyboard.press('Control+v')
    await expect(sections(page)).toHaveCount(3)
    await waitSaved(id, (content) => content.length === 3)
    const saved = await savedContent(id)
    expect(saved.map((item) => item.props.title)).toEqual([
      'Página de teste',
      'Copiável',
      'Copiável',
    ])
    expect(new Set(saved.map((item) => item.props.id)).size).toBe(3)

    // Desfazer tira a colada.
    await page.getByRole('button', { name: 'Desfazer' }).first().click()
    await expect(sections(page)).toHaveCount(2)

    // Num campo de texto, Ctrl+V cola o texto, e não uma seção.
    await pick(page, sections(page).nth(1))
    const input = page
      .locator('form[class*="_PuckFields_"]:visible')
      .locator('input:visible, textarea:visible')
      .first()
    await input.focus()
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(500)
    await expect(sections(page)).toHaveCount(2)
  })

  test('E1 colar respeita o limite de 100 seções', async ({ page }) => {
    const many = Array.from({ length: 100 }, (_, index) =>
      richText(`RichText-m${index}`, `Seção ${index}`),
    )
    const { id } = await createPage(many)
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await page.goto(`${BASE}/admin/editor/${id}`)
    await expect(sections(page)).toHaveCount(100, { timeout: 180_000 })
    await page.evaluate(() =>
      window.localStorage.setItem(
        'gp:secao-copiada',
        JSON.stringify({
          kind: 'gp-section',
          version: 2,
          item: {
            type: 'RichText',
            props: {
              id: 'RichText-x',
              menuLabel: '',
              title: 'Colada',
              body: '<p>x</p>',
              style: 'light',
              anim: 'site',
            },
          },
        }),
      ),
    )
    await page.reload()
    await expect(sections(page)).toHaveCount(100, { timeout: 180_000 })
    await page.getByRole('button', { name: 'Adicionar seção' }).first().click()
    await expect(page.locator('.ed-paste').getByRole('button', { name: 'Colar' })).toBeDisabled()
  })

  test('E1 seção guardada com formato errado não aparece para colar', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await page.goto(`${BASE}/admin`)
    await page.evaluate(() =>
      window.localStorage.setItem(
        'gp:secao-copiada',
        JSON.stringify({
          kind: 'gp-section',
          version: 2,
          item: { type: 'Hero', props: { id: 'x', title: 42 } },
        }),
      ),
    )
    await openEditor(page, id, 1)
    await expect(page.locator('.ed-paste')).toHaveCount(0)
    await pick(page, sections(page).first())
    await page.keyboard.press('Control+v')
    await page.waitForTimeout(500)
    await expect(sections(page)).toHaveCount(1)
  })

  test('E1 menu ⋯ no celular', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1'), richText('RichText-a1', 'No celular')])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    await preview(page).getByRole('button', { name: 'Mais ações' }).click()
    const menu = preview(page).getByRole('menu', { name: 'Mais ações' })
    await expect(menu).toBeVisible()
    // O menu cabe inteiro na prévia.
    const fits = await menu.evaluate((element) => {
      const box = element.getBoundingClientRect()
      return box.left >= 0 && box.right <= window.innerWidth
    })
    expect(fits).toBe(true)
    await preview(page).locator('body').press('Escape')
    await expect(menu).toBeHidden()
    await noSideScroll(page)
  })

  test('E5 "Ver como visitante": rascunho com botões que funcionam, sem publicar', async ({
    page,
    context,
  }) => {
    const { id, slug } = await createPage([])
    await setContent(id, [
      hero('Hero-a1', 'Rascunho visível'),
      cta('CallToAction-a1', 'Vá até o fim', {
        label: 'Ir para o fim',
        link: { kind: 'section', pageId: id, sectionId: 'RichText-fim' },
      }),
      cta('CallToAction-a2', 'Fora', {
        label: 'Abrir outro site',
        link: { kind: 'url', url: 'https://example.com/' },
      }),
      ...Array.from({ length: 4 }, (_, index) => richText(`RichText-m${index}`, `Meio ${index}`)),
      richText('RichText-fim', 'Fim da página', 'Fim'),
    ])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 8)

    await page.getByRole('button', { name: 'Ver como visitante' }).click()
    const dialog = page.getByRole('dialog', { name: 'Ver como visitante' })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Prévia do rascunho')
    await expect(dialog).toContainText('Ainda não está no ar')
    await expect(page.getByRole('button', { name: 'Voltar a editar' })).toBeFocused()

    const site = page.frameLocator('.ed-visitor__frame')
    await expect(site.getByRole('heading', { name: 'Rascunho visível' })).toBeVisible()
    // Botões de verdade (no editor eles são só texto).
    const inside = site.getByRole('link', { name: 'Ir para o fim' })
    await expect(inside).toBeVisible()
    await inside.click()
    expect(page.url()).toContain(`/admin/editor/${id}`)
    await expect
      .poll(() =>
        site
          .getByRole('heading', { name: 'Fim da página' })
          .evaluate((element) => element.getBoundingClientRect().top < window.innerHeight),
      )
      .toBe(true)

    // Link de fora abre outra aba, e a prévia continua.
    await context.route('https://example.com/**', (route) =>
      route.fulfill({ body: '<title>fora</title>', contentType: 'text/html' }),
    )
    const popup = context.waitForEvent('page')
    await site.getByRole('link', { name: 'Abrir outro site' }).click()
    const opened = await popup
    await opened.waitForURL(/example\.com/)
    await opened.close()
    await expect(dialog).toBeVisible()

    // Celular: a mesma página, com 390 px.
    await dialog.getByRole('button', { name: 'Celular' }).click()
    await expect.poll(() => site.locator('body').evaluate(() => window.innerWidth)).toBe(390)
    await expect(site.getByRole('heading', { name: 'Rascunho visível' })).toBeVisible()
    await noSideScroll(page)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    // Nada foi publicado: o site continua sem a página.
    const response = await page.request.get(`${BASE}/${slug}`)
    expect(response.status()).toBe(404)
  })

  test('E5 no celular, pelo menu ⋯ do editor', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1', 'No celular')])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: 'Mais opções do editor' }).click()
    await page.getByRole('button', { name: 'Ver como visitante' }).click()
    const dialog = page.getByRole('dialog', { name: 'Ver como visitante' })
    await expect(dialog).toBeVisible()
    // No celular, a tela já é o celular: sem os botões Computador e Celular.
    await expect(dialog.getByRole('button', { name: 'Computador' })).toHaveCount(0)
    const site = page.frameLocator('.ed-visitor__frame')
    await expect(site.getByRole('heading', { name: 'No celular' })).toBeVisible()
    await noSideScroll(page)
    await page.getByRole('button', { name: 'Voltar a editar' }).click()
    await expect(dialog).toBeHidden()
  })
})
