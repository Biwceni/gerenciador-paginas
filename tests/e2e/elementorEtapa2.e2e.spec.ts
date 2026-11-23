import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Melhorias inspiradas no Elementor, etapa 2 (decisões de 2026-11-15): "Onde aparece" (E3), jeito
// da seção ao pôr pelo catálogo (E7), mapa no Contato (E9) e Sua marca dentro do editor (E8). No
// banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const ADDRESS = 'Rua das Flores, 100 - Centro, Belo Horizonte - MG'
const created: number[] = []
let pageCount = 0

const hero = (id: string, title = 'Página de teste') => ({
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
  },
})

const richText = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  type: 'RichText',
  props: {
    id,
    menuLabel: '',
    title,
    body: '<p>Parágrafo.</p>',
    style: 'light',
    anim: 'site',
    ...extra,
  },
})

const contact = (id: string, extra: Record<string, unknown> = {}) => ({
  type: 'Contact',
  props: {
    id,
    menuLabel: '',
    title: 'Fale com a gente',
    text: 'Estamos aqui.',
    style: 'light',
    anim: 'site',
    ...extra,
  },
})

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(content: unknown[], status: 'draft' | 'published' = 'draft') {
  const payload = await getPayload({ config })
  const slug = `elementor2-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title: `Etapa 2 ${pageCount}`, slug, content: wrap(content), _status: status },
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

async function siteGlobal(draft: boolean) {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'site', depth: 0, draft, overrideAccess: true })
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
const fields = (page: Page) => page.locator('form[class*="_PuckFields_"]:visible')

async function openFieldTab(page: Page, name: string) {
  await page.getByRole('tab', { name }).click()
  await page.waitForTimeout(300)
}

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

/** A variável de tema que a prévia pôs no `body` dela. */
const previewVar = (page: Page, name: string) =>
  preview(page)
    .locator('body')
    .evaluate((body, variable) => body.style.getPropertyValue(variable).trim(), name)

let previous: Record<string, unknown> | null = null

/** Sua marca no ar e no rascunho iguais, para cada teste começar do mesmo jeito. */
async function resetSite() {
  const payload = await getPayload({ config })
  const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
  await payload.updateGlobal({
    slug: 'site',
    data: {
      name: 'Doces da Ana',
      personality: 'classico',
      colors: {
        primary: '#a0306a',
        background: '#ffffff',
        surface: '#f6eef2',
        text: '#1d1b1c',
        footer: '#2a1420',
      },
      fonts: { headings: 'Lora', body: 'Figtree' },
      contact: { ...site.contact, address: ADDRESS },
      _status: 'published',
    },
    overrideAccess: true,
  })
}

test.describe('editor: melhorias do Elementor, etapa 2', () => {
  test.beforeAll(async () => {
    await seedTestUser()
    const site = await siteGlobal(false)
    previous = {
      name: site.name,
      personality: site.personality ?? 'classico',
      colors: site.colors,
      fonts: site.fonts,
      contact: site.contact,
    }
  })

  test.beforeEach(async () => {
    await resetSite()
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
    const payload = await getPayload({ config })
    if (previous) {
      await payload.updateGlobal({
        slug: 'site',
        data: { ...previous, _status: 'published' },
        overrideAccess: true,
      })
    }
    await cleanupTestUser()
  })

  test('E3 "Onde aparece": só no computador, com marca na prévia e no site', async ({ page }) => {
    const { id, slug } = await createPage(
      [hero('Hero-a1'), richText('RichText-a1', 'Só no computador')],
      'published',
    )
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)

    // A primeira seção não tem a opção: explica por quê.
    await pick(page, sections(page).nth(0))
    await openFieldTab(page, 'Aparência')
    await expect(fields(page)).toContainText('A primeira seção aparece sempre')
    await expect(fields(page).getByRole('switch')).toHaveCount(0)

    await pick(page, sections(page).nth(1))
    await openFieldTab(page, 'Aparência')
    const desktop = fields(page).getByRole('switch', { name: 'Mostrar no computador' })
    const mobile = fields(page).getByRole('switch', { name: 'Mostrar no celular' })
    await expect(desktop).toBeChecked()
    await expect(mobile).toBeChecked()
    await mobile.click()
    await expect(mobile).not.toBeChecked()
    // O que sobrou fica travado: os dois não desligam juntos.
    await expect(desktop).toBeDisabled()
    await expect(fields(page)).toContainText('No celular, a seção some')
    await waitSaved(id, (content) => content[1].props.devices === 'desktop')
    const mark = () =>
      sections(page)
        .nth(1)
        .evaluate((element) => getComputedStyle(element, '::before').content)
    await expect(sections(page).nth(1)).toHaveAttribute('data-ed-devices', 'desktop')
    await expect.poll(mark).toBe('"Só no computador"')

    await page.getByRole('button', { name: 'Ver como celular' }).click()
    await expect.poll(mark).toBe('"Escondida no celular"')
    await page.getByRole('button', { name: 'Ver como computador' }).click()

    // Publicar lista a seção que aparece só num aparelho.
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Texto simples: só no computador')
    await dialog
      .getByRole('button', { name: /Publicar/ })
      .last()
      .click()
    await expect(page.getByText('Pronto, a página está no ar')).toBeVisible({ timeout: 30_000 })

    // No site: no computador aparece; no celular, não.
    await page.goto(`${BASE}/${slug}`)
    await expect(page.getByRole('heading', { name: 'Só no computador' })).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(page.getByRole('heading', { name: 'Só no computador' })).toBeHidden()
    await noSideScroll(page)
  })

  test('E7 pôr pelo catálogo oferece o jeito da seção, e a escolha fica', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)

    await page.getByRole('button', { name: 'Adicionar seção' }).first().click()
    await page.locator('.ed-palitem:not([inert])', { hasText: 'Destaques' }).first().click()
    await expect(sections(page)).toHaveCount(2)
    const bar = page.getByRole('radiogroup', { name: /Jeito do/ })
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('radio')).toHaveCount(3)
    await bar.getByRole('radio', { name: 'Números' }).check()
    await waitSaved(id, (content) => content.some((item) => item.props.marker === 'number'))
    await page.getByRole('button', { name: 'Pronto' }).click()
    await expect(bar).toBeHidden()
    await noSideScroll(page)
  })

  test('E9 mapa no Contato: quadro sem Google, "Como chegar" e opção no editor', async ({
    page,
  }) => {
    const { id, slug } = await createPage([hero('Hero-a1'), contact('Contact-a1')], 'published')
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)

    await pick(page, sections(page).nth(1))
    const map = fields(page).getByRole('switch', { name: 'Mostrar mapa do endereço' })
    await expect(map).toBeEnabled()
    await map.click()
    await waitSaved(id, (content) => content[1].props.map === true)
    await expect(sections(page).nth(1).locator('.contact-map')).toContainText(ADDRESS)

    // Publica e confere o site: nenhum pedido ao Google antes do toque.
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Publicar/ })
      .last()
      .click()
    await expect(page.getByText('Pronto, a página está no ar')).toBeVisible({ timeout: 30_000 })

    const google: string[] = []
    page.on('request', (request) => {
      if (/google\.com\/maps|maps\.googleapis/.test(request.url())) google.push(request.url())
    })
    await page.goto(`${BASE}/${slug}`)
    const facade = page.locator('.contact-map')
    await facade.scrollIntoViewIfNeeded()
    await expect(facade).toContainText(ADDRESS)
    await expect(facade.getByRole('link', { name: 'Como chegar' })).toHaveAttribute(
      'href',
      /google\.com\/maps\/dir\/\?api=1&destination=/,
    )
    await expect(page.locator('.contact-map iframe')).toHaveCount(0)
    expect(google).toEqual([])
    await page.setViewportSize({ width: 390, height: 844 })
    await noSideScroll(page)
  })

  test('E9 sem endereço, a opção do mapa fica desligada e explica', async ({ page }) => {
    const payload = await getPayload({ config })
    const site = await siteGlobal(false)
    await payload.updateGlobal({
      slug: 'site',
      data: { contact: { ...site.contact, address: null }, _status: 'published' },
      overrideAccess: true,
    })
    const { id } = await createPage([hero('Hero-a1'), contact('Contact-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, sections(page).nth(1))
    await expect(
      fields(page).getByRole('switch', { name: 'Mostrar mapa do endereço' }),
    ).toBeDisabled()
    await expect(fields(page)).toContainText('Configurações')
  })

  test('E8 Sua marca no editor: muda a prévia, guarda o rascunho e publica junto', async ({
    page,
  }) => {
    const { id, slug } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)

    const button = page.getByRole('button', { name: /^Sua marca/ })
    await expect(button).toBeVisible()
    await expect(button).not.toContainText('rascunho')
    await button.click()
    const panel = page.getByRole('dialog', { name: 'Sua marca' })
    await expect(panel).toContainText('É a mesma Sua marca do painel.')
    await expect(panel).toContainText('Vale para todas as páginas do site.')

    await panel.getByRole('button', { name: /^Acolhedor/ }).click()
    await expect(preview(page).locator('body')).toHaveAttribute('data-personality', 'aconchego')
    await expect(
      page.getByText('Sua marca guardada. O site muda quando você publicar.'),
    ).toBeVisible()
    await expect(button).toContainText('rascunho')

    const before = await previewVar(page, '--color-primary')
    await panel.getByRole('button', { name: /^Noite com a cor do logo/ }).click()
    await expect.poll(() => previewVar(page, '--color-background')).not.toBe('#ffffff')
    const fontButton = panel.getByRole('button', { name: /Cormorant Garamond e Montserrat/ })
    if (await fontButton.count()) await fontButton.click()
    else await panel.getByRole('button', { name: /Moderna · DM Sans/ }).click()
    await expect.poll(() => previewVar(page, '--font-body')).not.toContain('Figtree')
    expect(before).toBeTruthy()

    await expect
      .poll(async () => (await siteGlobal(true)).personality, { timeout: 20_000 })
      .toBe('aconchego')
    expect((await siteGlobal(false)).personality).toBe('classico')
    await noSideScroll(page)
    await page.screenshot({ path: test.info().outputPath('sua-marca-painel.png') })

    // Esc fecha o painel; Publicar já vem com a caixa de Sua marca marcada.
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const withBrand = dialog.getByRole('checkbox', {
      name: 'Publicar também Sua marca (muda todas as páginas)',
    })
    await expect(withBrand).toBeChecked()
    await expect(dialog).toContainText('Sua marca vai junto')
    await dialog
      .getByRole('button', { name: /Publicar/ })
      .last()
      .click()
    await expect(page.getByText('Pronto, a página está no ar')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Sua marca também foi publicada/)).toBeVisible()
    expect((await siteGlobal(false)).personality).toBe('aconchego')
    await page.getByRole('button', { name: 'Continuar editando' }).click()
    await expect(button).not.toContainText('rascunho')

    await page.goto(`${BASE}/${slug}`)
    await expect(page.locator('body')).toHaveAttribute('data-personality', 'aconchego')
  })

  test('E8 rascunho de antes: a caixa vem desmarcada e o aviso explica', async ({ page }) => {
    const payload = await getPayload({ config })
    await payload.updateGlobal({
      slug: 'site',
      data: { personality: 'vitrine', _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await expect(page.getByRole('button', { name: /^Sua marca/ })).toContainText('rascunho')
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('checkbox', { name: /Publicar também Sua marca/ }),
    ).not.toBeChecked()
    await expect(dialog).toContainText('O visual Impacto ainda não está no ar')
    await expect(dialog.getByRole('button', { name: 'Publicar mesmo assim' })).toBeVisible()
    await dialog.getByRole('button', { name: /Publicar mesmo assim/ }).click()
    await expect(page.getByText('Pronto, a página está no ar')).toBeVisible({ timeout: 30_000 })
    // A marca não foi junto: continua em rascunho.
    expect((await siteGlobal(false)).personality).toBe('classico')
  })

  test('E8 Sua marca falha ao publicar: a página fica no ar e dá para tentar de novo', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: /^Sua marca/ }).click()
    await page
      .getByRole('dialog', { name: 'Sua marca' })
      .getByRole('button', { name: /^Revista/ })
      .click()
    await expect(page.getByText('Sua marca guardada.')).toBeVisible()

    // Só o pedido que publica as configurações falha.
    let fail = true
    await page.route('**/api/globals/site', async (route) => {
      if (fail && route.request().method() === 'POST') {
        await route.fulfill({ status: 500, body: JSON.stringify({ errors: [{ message: 'x' }] }) })
      } else await route.continue()
    })
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /Publicar/ })
      .last()
      .click()
    await expect(page.getByText('Pronto, a página está no ar')).toBeVisible({ timeout: 30_000 })
    const alert = page.getByRole('alert').filter({ hasText: 'Sua marca não foi publicada' })
    await expect(alert).toBeVisible()
    expect((await siteGlobal(false)).personality).toBe('classico')

    fail = false
    await alert.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByText(/Sua marca também foi publicada/)).toBeVisible({
      timeout: 20_000,
    })
    expect((await siteGlobal(false)).personality).toBe('editorial')
  })

  test('E8 Sua marca mudou noutra tela: o editor oferece atualizar a prévia', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await expect(preview(page).locator('body')).toHaveAttribute('data-personality', 'classico')

    const payload = await getPayload({ config })
    await payload.updateGlobal({
      slug: 'site',
      data: { personality: 'vitrine', _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    // Volta para a aba do editor.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    const notice = page.getByRole('status').filter({ hasText: 'Sua marca mudou em outra tela.' })
    await expect(notice).toBeVisible()
    await notice.getByRole('button', { name: 'Atualizar prévia' }).click()
    await expect(notice).toBeHidden()
    await expect(preview(page).locator('body')).toHaveAttribute('data-personality', 'vitrine')
    await expect(page.getByRole('button', { name: /^Sua marca/ })).toContainText('rascunho')
  })

  test('E8 no celular: Sua marca pelo menu ⋯, em tela cheia', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a1')])
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: 'Mais opções' }).click()
    await page.getByRole('button', { name: /Sua marca/ }).click()
    const panel = page.getByRole('dialog', { name: 'Sua marca' })
    await expect(panel).toBeVisible()
    const box = await panel.boundingBox()
    expect(box?.width).toBe(390)
    expect(box?.y).toBe(0)
    await noSideScroll(page)
    await page.screenshot({ path: test.info().outputPath('sua-marca-celular.png') })
    await panel.getByRole('button', { name: 'Fechar Sua marca' }).click()
    await expect(panel).toBeHidden()
  })
})
