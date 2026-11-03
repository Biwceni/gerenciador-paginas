import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Ajustes da crítica de design de 03/11/2026 (C1 a C32), no banco de TEST_DATABASE_URL.
// Sem o Storage: as fotos ficam no próprio servidor.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()
const WIDTHS = [320, 390, 768, 1024, 1440]
const PUBLISHED = '#1d4ed8'
const TRIED = '#b23a2b'
const BUTTON = 'Agendar consulta'

// PNG de 1 pixel, que o servidor consegue ler.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)

let homeId: number
let formId: number
const photoIds: number[] = []
let previous: { site: object; header: object } | null = null

const content = (sections: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: sections },
})

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
}

/** A página não rola para o lado. */
async function noSideScroll(page: Page, where: string) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }))
  expect(scroll, `${where} rola para o lado`).toBeLessThanOrEqual(width)
}

/** Cor principal do site, como o visitante vê. */
const sitePrimary = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--color-primary').trim())

test.describe.serial('crítica de design', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    for (const [index, alt] of ['Com descrição', ''].entries()) {
      const photo = await payload.create({
        collection: 'media',
        data: { alt },
        file: {
          data: PNG,
          mimetype: 'image/png',
          name: `critica-${SUFFIX}-${index}.png`,
          size: PNG.length,
        },
        overrideAccess: true,
      })
      photoIds.push(photo.id)
    }
    const form = await payload.create({
      collection: 'forms',
      data: {
        title: `Fale conosco ${SUFFIX}`,
        submitButtonLabel: 'Enviar',
        fields: [
          { blockType: 'text', name: 'nome', label: 'Nome', required: true, width: 100 },
          { blockType: 'email', name: 'email', label: 'E-mail', required: false, width: 100 },
        ],
      },
      overrideAccess: true,
    })
    formId = form.id
    const home = await payload.create({
      collection: 'pages',
      data: {
        title: 'Início Crítica',
        slug: `inicio-critica-${SUFFIX}`,
        content: content([
          {
            type: 'Hero',
            props: {
              id: 'Hero-critica',
              title: 'Sorrisos cuidados com carinho',
              text: 'Clínica no centro.',
              button: { label: BUTTON, link: { kind: 'whatsapp' } },
              image: null,
              style: 'soft',
              align: 'left',
              height: 'normal',
            },
          },
          {
            type: 'Contact',
            props: {
              id: 'Contact-critica',
              menuLabel: '',
              title: 'Contato',
              text: '',
              style: 'light',
            },
          },
        ]),
        _status: 'published',
      },
      overrideAccess: true,
    })
    homeId = home.id
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
    previous = {
      // Valores explícitos: num banco zerado as Configurações ainda não existem, e um contato
      // vazio ({}) não apagaria o que este teste preenche (o site novo conta os passos feitos).
      site: {
        ...(site.name ? { name: site.name } : {}),
        homepage: site.homepage ?? null,
        colors: { primary: site.colors?.primary ?? PUBLISHED },
        contact: {
          whatsapp: site.contact?.whatsapp ?? null,
          phone: site.contact?.phone ?? null,
          email: site.contact?.email ?? null,
          address: site.contact?.address ?? null,
        },
      },
      header: { items: header.items, button: header.button },
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Clínica Odontológica Sorriso Pleno',
        homepage: homeId,
        colors: { primary: PUBLISHED },
        contact: {
          whatsapp: '(35) 99999-4521',
          phone: '(35) 3333-4521',
          email: 'contato@sorriso.com.br',
          address: 'Rua das Flores, 10 · Centro',
        },
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: ['Início', 'Tratamentos', 'Quem somos', 'Contato'].map((label) => ({
          label,
          link: { kind: 'page' as const, page: homeId },
        })),
        button: { label: BUTTON, link: { kind: 'whatsapp' } },
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
        slug: 'header',
        data: { ...previous.header, _status: 'published' },
        overrideAccess: true,
      })
      await payload.updateGlobal({
        slug: 'site',
        data: { ...previous.site, _status: 'published' },
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
    if (formId) await payload.delete({ collection: 'forms', id: formId, overrideAccess: true })
    for (const id of photoIds)
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    await page?.close()
    await cleanupTestUser()
  })

  test('Configurações: a cor fica guardada e só vai ao ar ao publicar', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/configuracoes')
    await expect(page.getByText('Tudo no ar')).toBeVisible()
    await expect(page.getByText('Nada para publicar')).toBeVisible()
    await page.getByLabel('Cor principal', { exact: true }).last().fill(TRIED)
    await expect(page.getByText('Guardado, falta publicar')).toBeVisible({ timeout: 20_000 })

    await open(page, '/')
    expect(await sitePrimary(page)).toBe(PUBLISHED)

    await open(page, '/admin')
    await expect(page.getByText('Configurações com mudanças fora do ar')).toBeVisible()

    await open(page, '/admin/configuracoes')
    await expect(page.getByText('Guardado, falta publicar')).toBeVisible()
    await page.getByRole('button', { name: 'Publicar configurações' }).click()
    await expect(page.getByText('Configurações publicadas em todo o site.')).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Tudo no ar')).toBeVisible()

    await open(page, '/')
    expect(await sitePrimary(page)).toBe(TRIED)
  })

  test('Minha conta salva o nome sozinho, sem botão', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/account')
    await expect(page.getByRole('button', { name: 'Salvar nome' })).toHaveCount(0)
    const name = `Pessoa ${SUFFIX}`
    await page.getByLabel('Nome', { exact: true }).fill(name)
    await expect(page.getByText('Salvando…')).toBeVisible()
    await expect(page.getByText('Tudo salvo')).toBeVisible({ timeout: 15_000 })
    const payload = await panel()
    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: testUser.email } },
      overrideAccess: true,
    })
    expect(docs[0].name).toBe(name)
  })

  test('Menu e rodapé e Formulário com rótulos visíveis em 390 px', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/admin/menu-e-rodape')
    const item = page.locator('.gp-menuitem').first()
    await expect(item.getByText('Texto no menu', { exact: true })).toBeVisible()
    await expect(item.getByText('Abre a página', { exact: true })).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Texto do link 2' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Página do link 2' })).toBeVisible()
    const move = await page
      .getByRole('button', { name: 'Descer Início' })
      .evaluate((element) => element.getBoundingClientRect().height)
    expect(move).toBeGreaterThanOrEqual(44)

    await open(page, `/admin/formularios/${formId}`)
    const question = page.locator('.gp-question').first()
    await expect(question.getByText('Pergunta', { exact: true })).toBeVisible()
    await expect(question.getByText('Tipo de resposta', { exact: true })).toBeVisible()
  })

  test('Nova página: escolher um modelo põe o foco no nome', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/admin/paginas/nova')
    await page.getByRole('radio').nth(1).click()
    await expect(page.locator('#np-name')).toBeFocused()
    await expect(page.locator('#np-name')).toBeInViewport()
  })

  test('Fotos: o filtro "Sem descrição" mostra só as fotos sem descrição', async () => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page, '/admin/fotos')
    await page.getByRole('button', { name: /^Sem descrição \(\d+\)$/ }).click()
    const items = page.locator('.gp-media__item')
    expect(await items.count()).toBeGreaterThan(0)
    for (const item of await items.all()) {
      await expect(item.locator('.gp-media__noalt')).toHaveText('Sem descrição')
    }
    await expect(page.getByText(`critica-${SUFFIX}-0.png`)).toHaveCount(0)
  })

  test('site em 390 px: botão do topo à vista e contatos com 44 px', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    const cta = page.locator('.site-header__cta')
    await expect(cta).toBeVisible()
    await expect(cta).toHaveAccessibleName(BUTTON)
    const name = await page.locator('.site-header__brand span').boundingBox()
    const button = await cta.boundingBox()
    expect(name!.x + name!.width).toBeLessThanOrEqual(button!.x)

    const heights = await page
      .locator('a.contact__item')
      .evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height))
    expect(heights.length).toBe(4)
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44)
  })

  test('menu do celular com fundo escuro, que fecha ao tocar', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const backdrop = page.locator('.site-header__backdrop')
    await expect(backdrop).toBeVisible()
    await page.mouse.click(195, 800)
    await expect(backdrop).toHaveCount(0)
    await expect(page.locator('#menu-celular')).toBeHidden()

    // Esc também fecha, com o foco de volta no ☰.
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page.keyboard.press('Escape')
    await expect(page.locator('#menu-celular')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
  })

  test('nenhuma tela do painel nem do site rola para o lado', async () => {
    const screens = [
      '/admin',
      '/admin/paginas',
      '/admin/paginas/nova',
      '/admin/fotos',
      '/admin/menu-e-rodape',
      '/admin/formularios',
      `/admin/formularios/${formId}`,
      '/admin/configuracoes',
      '/admin/mensagens',
      '/admin/avancado',
      '/admin/account',
      `/admin/editor/${homeId}`,
      '/',
    ]
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of screens) {
        await open(page, path)
        await noSideScroll(page, `${path} em ${width} px`)
      }
    }
  })
})
