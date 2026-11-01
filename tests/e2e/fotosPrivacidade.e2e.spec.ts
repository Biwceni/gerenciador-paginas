import { randomBytes } from 'node:crypto'

import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import { PRIVACY_TEMPLATE_KEY } from '../../src/lib/privacy.js'
import config from '../../src/payload.config.js'
import { CONTENT_VERSION, emptyPageContent } from '../../src/puck/schema.js'
import { templateSeeds } from '../../src/seed/templates/data.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Fotos, página de privacidade e Avançado (v2, entrega 3b), no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()

// PNG de 1 pixel, que o servidor consegue ler.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG })

const editor = {
  email: `editor-${SUFFIX}@exemplo.com.br`,
  password: 'senha-de-teste',
  role: 'editor' as const,
}

async function removeUploaded() {
  const payload = await panel()
  await payload.delete({
    collection: 'media',
    where: { filename: { contains: String(SUFFIX) } },
    overrideAccess: true,
  })
}

async function removePrivacyPages() {
  const payload = await panel()
  await payload.updateGlobal({
    slug: 'site',
    data: { name: 'Café Teste', privacyPage: null, contact: { email: null }, _status: 'published' },
    overrideAccess: true,
  })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { contains: 'politica-de-privacidade' } },
    draft: true,
    depth: 0,
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

const footerLink = (page: Page) =>
  page.locator('.site-footer').getByRole('link', { name: 'Privacidade' })

test.describe.serial('fotos, privacidade e avançado', () => {
  let page: Page
  let basePageId: number

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    await payload.create({ collection: 'users', data: editor, overrideAccess: true })
    // O modelo de privacidade, como o `npm run modelos` grava.
    const seed = templateSeeds.find((item) => item.key === PRIVACY_TEMPLATE_KEY)!
    await payload.create({ collection: 'templates', data: seed, overrideAccess: true })
    await removePrivacyPages()
    // Com alguma página, o painel não leva para o início guiado.
    basePageId = (
      await payload.create({
        collection: 'pages',
        data: { title: 'Base', slug: `base-${SUFFIX}`, content: emptyPageContent() },
        draft: true,
        overrideAccess: true,
      })
    ).id

    const context = await browser.newContext()
    page = await context.newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await removeUploaded()
    await removePrivacyPages()
    const payload = await panel()
    await payload.delete({
      collection: 'pages',
      id: basePageId,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
    // Modelo gravado muda o Painel de site vazio, e os outros arquivos dividem o banco.
    await payload.delete({
      collection: 'templates',
      where: { key: { equals: PRIVACY_TEMPLATE_KEY } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'users',
      where: { email: { equals: editor.email } },
      overrideAccess: true,
    })
    await cleanupTestUser()
  })

  test('envia várias fotos: uma falha, o que não serve é recusado, as outras chegam', async () => {
    await page.goto(`${BASE}/admin/fotos`)
    await page.waitForLoadState('networkidle')

    // A primeira tentativa desta foto cai; as outras passam.
    const failing = `falha-${SUFFIX}.png`
    let failed = false
    await page.route('**/api/media', async (route) => {
      const body = route.request().postDataBuffer()?.toString('latin1') ?? ''
      if (!failed && body.includes(failing)) {
        failed = true
        await route.abort()
      } else await route.continue()
    })

    await page.locator('.gp-drop input[type="file"]').setInputFiles([
      png(`uma-${SUFFIX}.png`),
      png(failing),
      png(`duas-${SUFFIX}.png`),
      { name: `nota-${SUFFIX}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF') },
      // 6 MB: acima do limite de corpo da Vercel e abaixo do nosso.
      {
        name: `grande-${SUFFIX}.png`,
        mimeType: 'image/png',
        buffer: Buffer.concat([PNG, randomBytes(6_000_000)]),
      },
      { name: `enorme-${SUFFIX}.png`, mimeType: 'image/png', buffer: Buffer.alloc(10_000_001) },
    ])

    await expect(page.getByText('Este arquivo não é uma foto')).toBeVisible()
    await expect(page.getByText('Esta foto passa de 10 MB')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible({
      timeout: 60_000,
    })
    // As outras continuaram: aparecem sem descrição.
    const photo = (name: string) => page.getByRole('button', { name: new RegExp(name) })
    await expect(photo(`uma-${SUFFIX}`)).toContainText('Sem descrição', { timeout: 60_000 })
    await expect(photo(`duas-${SUFFIX}`)).toBeVisible()
    await expect(photo(`grande-${SUFFIX}`)).toBeVisible({ timeout: 60_000 })

    // Só a que caiu tem "Tentar de novo": para o que não serve, não adianta.
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(photo(`falha-${SUFFIX}`)).toContainText('Sem descrição', { timeout: 60_000 })
    await expect(page.getByRole('button', { name: 'Tentar de novo' })).toHaveCount(0)
    await page.unroute('**/api/media')
  })

  test('escreve a descrição depois, em cada foto', async () => {
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: new RegExp(`uma-${SUFFIX}`) }).click()
    await page.getByLabel('O que aparece na foto?').fill('Fachada da loja')
    await expect(page.getByText('Salvo.')).toBeVisible({ timeout: 15_000 })

    await page.reload()
    await page.waitForLoadState('networkidle')
    const described = page.getByRole('button', { name: /Fachada da loja/ })
    await expect(described).toBeVisible()
    await expect(described).not.toContainText('Sem descrição')
  })

  test('no celular, a área de envio cabe na tela', async () => {
    await page.setViewportSize({ width: 390, height: 800 })
    await page.goto(`${BASE}/admin/fotos`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.gp-drop')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
    await page.setViewportSize({ width: 1366, height: 800 })
  })

  test('formulário avisa, a página nasce pelo modelo e o link aparece ao publicar', async () => {
    const payload = await panel()
    const form = await payload.create({
      collection: 'forms',
      data: {
        title: `Contato ${SUFFIX}`,
        fields: [{ blockType: 'text', name: 'nome', label: 'Nome', required: true }],
      },
      overrideAccess: true,
    })

    // Sem a página: aviso e botão.
    await page.goto(`${BASE}/admin/formularios/${form.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Seu site ainda não tem página de privacidade')).toBeVisible()
    await page.getByRole('link', { name: 'Criar agora' }).click()

    // A tela já vem com o modelo e o nome: é só confirmar.
    await expect(page).toHaveURL(new RegExp(`modelo=${PRIVACY_TEMPLATE_KEY}`))
    await expect(page.getByLabel('Nome da página')).toHaveValue('Política de privacidade')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Criar e começar a editar' }).click()
    await page.waitForURL(/\/admin\/editor\/\d+/, { timeout: 120_000 })
    const pageId = Number(page.url().match(/editor\/(\d+)/)![1])

    // O campo foi preenchido e o formulário avisa que falta publicar.
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.privacyPage).toBe(pageId)
    await page.goto(`${BASE}/admin/formularios/${form.id}`)
    await expect(page.getByText('ainda não está no ar')).toBeVisible({ timeout: 60_000 })

    const home = await payload.create({
      collection: 'pages',
      data: {
        title: 'Casa',
        slug: `casa-${SUFFIX}`,
        _status: 'published',
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Form',
                props: {
                  id: 'f',
                  menuLabel: '',
                  title: 'Fale',
                  text: '',
                  form: { formId: form.id },
                  successMessage: '',
                  style: 'light',
                },
              },
            ],
          },
        },
      },
      overrideAccess: true,
    })
    const openHome = () => page.goto(`${BASE}/casa-${SUFFIX}`)

    // Rascunho: nada de link no site.
    await openHome()
    await expect(page.locator('.site-footer')).toBeVisible({ timeout: 60_000 })
    await expect(footerLink(page)).toHaveCount(0)
    await expect(page.locator('.site-form').getByRole('link')).toHaveCount(0)

    // Publicada: rodapé e "Concordo" levam à política.
    await payload.update({
      collection: 'pages',
      id: pageId,
      data: { _status: 'published' },
      overrideAccess: true,
    })
    await openHome()
    await expect(footerLink(page)).toHaveAttribute('href', /politica-de-privacidade/)
    await expect(page.locator('.site-form').getByRole('link')).toHaveAttribute(
      'href',
      /politica-de-privacidade/,
    )

    // Mudou nas Configurações, muda na política.
    await page.goto(`${BASE}/admin/configuracoes`)
    await page.waitForLoadState('networkidle')
    const field = page.getByLabel('Qual página explica como você cuida dos dados?')
    await expect(field).toHaveValue(String(pageId))
    await page.getByLabel('E-mail', { exact: true }).fill(`dados-${SUFFIX}@exemplo.com.br`)
    await expect(page.getByText('Salvando…')).toBeVisible()
    await expect(page.getByText('Tudo salvo e no ar')).toBeVisible({ timeout: 20_000 })
    await page.goto(`${BASE}/politica-de-privacidade`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Política de privacidade')
    await expect(
      page.locator('#conteudo').getByRole('link', { name: `dados-${SUFFIX}@exemplo.com.br` }),
    ).toBeVisible()

    // Limpar nas Configurações tira o link.
    await page.goto(`${BASE}/admin/configuracoes`)
    await page.waitForLoadState('networkidle')
    await field.selectOption('')
    await expect(page.getByText('Salvando…')).toBeVisible()
    await expect(page.getByText('Tudo salvo e no ar')).toBeVisible({ timeout: 20_000 })
    await openHome()
    await expect(page.locator('.site-footer')).toBeVisible()
    await expect(footerLink(page)).toHaveCount(0)

    await payload.delete({
      collection: 'pages',
      id: home.id,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
    await payload.delete({ collection: 'forms', id: form.id, overrideAccess: true })
  })

  test('Avançado: administrador vê Usuários e Fotos, com um link só no menu', async () => {
    await page.goto(`${BASE}/admin/avancado`)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Avançado', level: 1 })).toBeVisible()
    await expect(page.locator('.gp-page h2')).toHaveText(['Usuários', 'Fotos (coleção)'])
    const links = page.locator('.gp-page').getByRole('link', { name: 'Abrir tela técnica' })
    await expect(links).toHaveCount(2)
    await expect(links.nth(0)).toHaveAttribute('href', '/admin/collections/users')
    await expect(links.nth(1)).toHaveAttribute('href', '/admin/collections/media')

    const nav = page.getByRole('navigation', { name: 'Menu do painel' })
    await expect(nav.getByRole('link', { name: 'Avançado' })).toHaveAttribute(
      'href',
      '/admin/avancado',
    )
    await expect(nav.getByRole('link', { name: 'Modelos' })).toHaveCount(0)
    await expect(nav.locator('details')).toHaveCount(0)
  })

  test('Avançado: quem não é administrador vai para o Painel', async ({ browser }) => {
    const context = await browser.newContext()
    const other = await context.newPage()
    await login({ page: other, user: editor })
    const nav = other.getByRole('navigation', { name: 'Menu do painel' })
    await expect(nav.getByRole('link', { name: 'Avançado' })).toHaveCount(0)
    await other.goto(`${BASE}/admin/avancado`)
    await other.waitForURL(`${BASE}/admin`)
    await expect(other.getByRole('heading', { name: 'Avançado' })).toHaveCount(0)
    await context.close()
  })
})
