import { type Browser, expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { templateSeeds } from '../../src/seed/templates/data.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Site novo do zero até o ar (v2, entrega 2a), no banco de TEST_DATABASE_URL. Usa a "Página de
// links", que não tem foto: o teste não depende do banco de fotos nem do Storage.

const BASE = 'http://localhost:3000'
const SITE_NAME = 'Café do Teste'

/** Os modelos de "Página de links", se o banco de testes ainda não tiver. Devolve os criados. */
async function seedLinkTemplates(): Promise<number[]> {
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'templates',
    where: { siteType: { equals: 'links' } },
    overrideAccess: true,
  })
  if (totalDocs) return []
  const ids: number[] = []
  for (const seed of templateSeeds.filter((item) => item.siteType === 'links')) {
    ids.push(
      (await payload.create({ collection: 'templates', data: seed, overrideAccess: true })).id,
    )
  }
  return ids
}

async function removeTemplates(ids: number[]) {
  const payload = await getPayload({ config })
  for (const id of ids) {
    await payload.delete({ collection: 'templates', id, overrideAccess: true })
  }
}

async function removePages() {
  const payload = await getPayload({ config })
  await payload.updateGlobal({
    slug: 'site',
    data: { homepage: null, name: 'Meu site', tagline: null, _status: 'published' },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'header',
    data: { items: [], _status: 'published' },
    overrideAccess: true,
  })
  const { docs } = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: true,
    pagination: false,
    overrideAccess: true,
  })
  for (const { id } of docs) {
    await payload.delete({
      collection: 'pages',
      id,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
  }
}

/** Visitante comum: o navegador sem nenhum cookie, contando as chamadas de login. */
async function asVisitor(browser: Browser, width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 800 } })
  const page = await context.newPage()
  const loginCalls: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/users/me')) loginCalls.push(request.url())
  })
  return { context, page, loginCalls }
}

/** Escolhe a primeira seção na prévia e muda o título dela, como a pessoa faria. */
async function editTitle(page: Page, title: string) {
  await page.frameLocator('iframe').locator('h1').first().click()
  await page.getByRole('textbox', { name: 'Título' }).first().fill(title)
}

test.describe.serial('site novo', () => {
  let page: Page
  let editorHref: string
  let templates: number[] = []

  test.beforeAll(async ({ browser }) => {
    await removePages()
    await seedTestUser()
    templates = await seedLinkTemplates()
    page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
  })

  test.afterAll(async () => {
    await removePages()
    await removeTemplates(templates)
    await cleanupTestUser()
  })

  test('o primeiro início guiado monta o site em rascunho', async () => {
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/admin/comecar`)

    await page.getByRole('radio', { name: /Página de links/ }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.fill('#ob-name', SITE_NAME)
    await page.getByRole('button', { name: 'Criar meu site' }).click()
    await page.waitForURL(/pronto=1/)

    await expect(page.getByText('Seu site ainda não está no ar.')).toBeVisible()
    await expect(page.getByText('Seu site está montado, em rascunho.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Para terminar seu site' })).toBeVisible()
    // A Página de links não usa foto: esse passo já nasce feito.
    await expect(page.getByText('1 de 5 feitos')).toBeVisible()

    const steps = page.locator('.gp-todo li')
    await expect(steps).toHaveCount(5)
    editorHref = (await steps.nth(4).getByRole('link').getAttribute('href')) ?? ''
    expect(editorHref).toMatch(/\/admin\/editor\/\d+$/)
    await expect(steps.nth(2).getByRole('link')).toHaveAttribute('href', editorHref)
    await expect(steps.nth(0).getByRole('link')).toHaveAttribute('href', '/admin/configuracoes')
  })

  test('o visitante vê "em construção", sem a barra e sem nenhuma chamada a mais', async ({
    browser,
  }) => {
    const { context, page: visitor, loginCalls } = await asVisitor(browser, 390)
    await visitor.goto(BASE)
    await expect(visitor.locator('h1').first()).toHaveText(SITE_NAME)
    await expect(visitor.getByText('Site em construção. Volte em breve.')).toBeVisible()
    await expect(visitor).toHaveTitle(SITE_NAME)
    await visitor.waitForLoadState('networkidle')
    await expect(visitor.getByRole('navigation', { name: 'Atalhos do painel' })).toHaveCount(0)
    expect(loginCalls).toHaveLength(0)
    await context.close()
  })

  test('quem está logado vê a barra no site em construção', async () => {
    await page.goto(BASE)
    const bar = page.getByRole('navigation', { name: 'Atalhos do painel' })
    await expect(bar.getByRole('link', { name: /Voltar ao painel/ })).toHaveAttribute(
      'href',
      '/admin',
    )
    await expect(bar.getByRole('link', { name: 'Editar esta página' })).toHaveAttribute(
      'href',
      editorHref,
    )
  })

  test('nas Configurações, a frase fica vazia, com o modelo só de dica', async () => {
    await page.goto(`${BASE}/admin/configuracoes`)
    await expect(page.locator('#st-tagline')).toHaveValue('')
    await expect(page.locator('#st-tagline')).toHaveAttribute('placeholder', /^Ex\.: ./)
    await expect(page.locator('#st-home option:checked')).toHaveText(/\(rascunho\)$/)
    await expect(page.getByText('Site em construção. Volte em breve.')).toBeVisible()
  })

  test('duas abas: a segunda a salvar recebe o aviso e para até recarregar', async () => {
    const context = page.context()
    const tabA = await context.newPage()
    const tabB = await context.newPage()
    await tabA.goto(`${BASE}${editorHref}`)
    await tabB.goto(`${BASE}${editorHref}`)
    await expect(tabA.locator('.ed-top__status')).toContainText('rascunho, ainda não está no ar')
    await expect(tabB.locator('.ed-top__status')).toContainText('rascunho, ainda não está no ar')

    // A própria aba salva várias vezes seguidas sem se acusar.
    await editTitle(tabB, 'Título da aba B')
    await expect(tabB.locator('.ed-top__status')).toContainText('Salvo automaticamente às')
    await tabB.getByRole('textbox', { name: 'Título' }).first().fill('Título da aba B de novo')
    await expect(tabB.locator('.ed-top__status')).toContainText('Salvando')
    await expect(tabB.locator('.ed-top__status')).toContainText('Salvo automaticamente às')
    await expect(tabB.getByRole('alertdialog')).toHaveCount(0)

    await editTitle(tabA, 'Título da aba A')
    const warning = tabA.getByRole('alertdialog')
    await expect(warning).toContainText('Esta página mudou em outra aba ou por outra pessoa')
    await expect(tabA.locator('.ed-top__status')).toContainText('Salvamento parado')

    // Recarregar traz o que a outra aba salvou, sem perguntar se quer sair.
    await warning.getByRole('button', { name: 'Carregar a versão nova' }).click()
    await expect(tabA.getByRole('alertdialog')).toHaveCount(0)
    await expect(tabA.frameLocator('iframe').locator('h1').first()).toHaveText(
      'Título da aba B de novo',
    )
    await tabA.close()
    await tabB.close()
  })

  test('publicar a inicial põe o site no ar, com o título que o Publicar mostrou', async ({
    browser,
  }) => {
    await page.goto(`${BASE}${editorHref}`)
    await expect(page.locator('.ed-summary:visible')).toContainText('Esta página')

    const dialog = page.getByRole('dialog')
    // O botão aparece antes de a tela estar pronta para o clique.
    await expect(async () => {
      await page.getByRole('button', { name: 'Publicar', exact: true }).click()
      await expect(dialog).toBeVisible({ timeout: 1000 })
    }).toPass()
    await expect(dialog).toContainText('o site sai do "em construção"')
    await expect(dialog).toContainText('texto de exemplo')
    const google = dialog.locator('.ed-check', { hasText: 'Aparece certinho no Google' })
    const shown = (await google.locator('.ed-check__text').textContent())?.replace(/[“”]/g, '')
    expect(shown).toBe(SITE_NAME)

    await dialog.getByRole('button', { name: 'Publicar mesmo assim' }).click()
    await expect(dialog).toContainText('Pronto, a página está no ar')

    const { context, page: visitor, loginCalls } = await asVisitor(browser)
    await visitor.goto(BASE)
    await expect(visitor).toHaveTitle(shown ?? '')
    await expect(visitor.locator('h1').first()).toHaveText('Título da aba B de novo')
    await visitor.waitForLoadState('networkidle')
    expect(loginCalls).toHaveLength(0)
    await context.close()

    await page.goto(`${BASE}/admin`)
    await expect(page.getByText('Seu site está no ar em')).toBeVisible()
    await expect(page.getByText('Seu site ainda não está no ar.')).toHaveCount(0)
  })

  test('com o site no ar, a barra aparece numa linha só no celular', async () => {
    const mobile = await page.context().newPage()
    await mobile.setViewportSize({ width: 390, height: 800 })
    await mobile.goto(BASE)
    const bar = mobile.getByRole('navigation', { name: 'Atalhos do painel' })
    await expect(bar.getByRole('link', { name: 'Editar esta página' })).toHaveAttribute(
      'href',
      editorHref,
    )
    expect((await bar.boundingBox())?.height).toBeLessThan(40)
    const overflow = await mobile.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(overflow).toBe(false)
    await mobile.close()
  })

  test('sair apaga o cookie, e a barra some', async () => {
    await page.goto(`${BASE}/admin`)
    await page.getByRole('link', { name: 'Sair' }).click()
    await page.waitForURL(/\/admin\/login/)
    const cookies = await page.context().cookies()
    expect(cookies.some((cookie) => cookie.name === 'gp-painel')).toBe(false)
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('navigation', { name: 'Atalhos do painel' })).toHaveCount(0)
  })

  test('sessão vencida: o cookie sozinho não mostra a barra, e é apagado', async () => {
    const context = page.context()
    await context.addCookies([{ name: 'gp-painel', value: '1', url: BASE }])
    await page.goto(BASE)
    await expect
      .poll(async () => (await context.cookies()).some((cookie) => cookie.name === 'gp-painel'))
      .toBe(false)
    await expect(page.getByRole('navigation', { name: 'Atalhos do painel' })).toHaveCount(0)
  })
})

test('a página de login continua sem cookie até entrar de verdade', async ({ browser }) => {
  await seedTestUser()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', 'senha errada')
  await page.click('button[type="submit"]')
  await expect(page.getByRole('alert')).toBeVisible()
  expect((await context.cookies()).some((cookie) => cookie.name === 'gp-painel')).toBe(false)

  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
  expect((await context.cookies()).some((cookie) => cookie.name === 'gp-painel')).toBe(true)
  await context.close()
  await cleanupTestUser()
})
