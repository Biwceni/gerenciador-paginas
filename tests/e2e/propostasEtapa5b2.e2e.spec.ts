import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { templateSeeds } from '../../src/seed/templates/data.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 5b-2: F3 (os modelos da Nova página
// pelo que a página mostra, com os do Começar primeiro) e "Salvar uma página como modelo". No banco
// de TEST_DATABASE_URL: grava os modelos de página como o `npm run modelos` e, no fim, apaga
// esses modelos, as páginas e os modelos salvos (os outros arquivos contam com o banco sem modelos).

const BASE = 'http://localhost:3000'

async function db() {
  return getPayload({ config })
}

async function setSite(shows: string[]) {
  const payload = await db()
  await payload.updateGlobal({
    slug: 'site',
    data: {
      name: 'Casa Azul',
      contact: { address: 'Rua A, 10 - Centro, Lavras - MG' },
      start: { shows: shows as never },
      _status: 'published',
    },
    overrideAccess: true,
  })
}

const PAGE_SEEDS = templateSeeds.filter((seed) => seed.kind === 'page')

async function seedPageModels() {
  const payload = await db()
  for (const seed of PAGE_SEEDS) {
    await payload.create({ collection: 'templates', data: seed, overrideAccess: true })
  }
}

async function cleanup() {
  const payload = await db()
  await payload.delete({
    collection: 'templates',
    where: { key: { in: PAGE_SEEDS.map((seed) => seed.key) } },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'site',
    data: {
      homepage: null,
      name: 'Meu site',
      contact: { address: null },
      start: { shows: [] },
      _status: 'published',
    },
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
  await payload.delete({
    collection: 'templates',
    where: { fromPage: { equals: true } },
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

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('load')
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

const cardTitles = (page: Page) =>
  page.locator('.gp-starts').first().locator(':scope > .gp-start b').allTextContents()

async function latestPage(title: string) {
  const payload = await db()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { title: { equals: title } },
    depth: 0,
    draft: true,
    overrideAccess: true,
  })
  return docs[0]
}

type Item = { type: string; props: Record<string, unknown> }
const itemsOf = (doc: { content?: unknown } | undefined) =>
  ((doc?.content as { data?: { content?: Item[] } })?.data?.content ?? []) as Item[]

test.describe.serial('Etapa 5b-2: modelos da Nova página e modelos salvos', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await cleanup()
    await seedPageModels()
    await seedTestUser()
    page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await signIn(page)
  })

  test.afterAll(async () => {
    await cleanup()
    await cleanupTestUser()
  })

  test('sem escolhas no Começar: os modelos na ordem de sempre, sem selo', async () => {
    await setSite([])
    await open(page, '/admin/paginas/nova')
    const titles = await cardTitles(page)
    expect(titles.slice(0, 3)).toEqual(['Vitrine de produtos', 'Serviços', 'Unidades'])
    expect(titles).toEqual(expect.arrayContaining(['Sobre', 'Política de privacidade']))
    expect(titles.slice(-1)).toEqual(['Em branco'])
    await expect(page.locator('.gp-start__tag')).toHaveCount(0)
    // O primeiro já vem escolhido, com o nome da página preenchido.
    await expect(page.locator('#np-name')).toHaveValue('Produtos')
    await expect(page.getByText(/textos de exemplo do seu ramo/)).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Seus modelos' })).toHaveCount(0)
  })

  test('com escolhas: os do Começar primeiro, com selo; o nome acompanha até a pessoa mexer', async () => {
    await setSite(['team', 'agenda'])
    await open(page, '/admin/paginas/nova')
    const titles = await cardTitles(page)
    expect(titles.slice(0, 3)).toEqual(['Agenda', 'Equipe', 'Vitrine de produtos'])
    await expect(page.locator('.gp-start__tag')).toHaveCount(2)
    await expect(page.locator('#np-name')).toHaveValue('Agenda')

    await page.getByRole('radio', { name: /^Equipe/ }).click()
    await expect(page.locator('#np-name')).toHaveValue('Equipe')
    await expect(page.locator('#np-name')).toBeFocused()
    await page.getByRole('radio', { name: /^Formulário/ }).click()
    await expect(page.locator('#np-name')).toHaveValue('Envie um arquivo')
    // Nome escrito pela pessoa fica, troque o modelo ou não.
    await page.fill('#np-name', 'Agenda de turmas')
    await page.getByRole('radio', { name: /^Contato/ }).click()
    await expect(page.locator('#np-name')).toHaveValue('Agenda de turmas')
    await page.getByRole('radio', { name: /^Em branco/ }).click()
    await expect(page.locator('#np-name')).toHaveValue('Agenda de turmas')

    await page.getByRole('radio', { name: /^Agenda/ }).click()
    await page.getByRole('button', { name: 'Criar e começar a editar' }).click()
    await page.waitForURL(/\/admin\/editor\//, { timeout: 60_000 })

    const doc = await latestPage('Agenda de turmas')
    expect(doc?.slug).toBe('agenda-de-turmas')
    const items = itemsOf(doc)
    expect(items[0].props.title).toBe('Agenda de turmas')
    const events = items.find((item) => item.type === 'Events')
    const today = new Date().toISOString().slice(0, 10)
    for (const item of (events?.props.items ?? []) as { date: string; place: string }[]) {
      expect(item.date > today).toBe(true)
      // `{cidade}` vira a cidade do endereço das Configurações.
      expect(item.place).toBe('Lavras')
    }
    expect(JSON.stringify(items)).not.toMatch(/\{nome\}|\{cidade\}/)
  })

  test('salvar uma página como modelo e criar outra com ele, igual', async () => {
    const original = await latestPage('Agenda de turmas')
    // A pessoa mexe na página antes de salvar: vai o rascunho mais recente.
    const payload = await db()
    const changed = itemsOf(original)
    changed[0].props.text = 'Turmas de sábado, com vagas limitadas.'
    await payload.update({
      collection: 'pages',
      id: original!.id,
      data: {
        content: {
          ...(original!.content as object),
          data: { root: { props: {} }, content: changed },
        },
      },
      draft: true,
      overrideAccess: true,
    })

    await open(page, '/admin/paginas')
    await page.getByRole('button', { name: 'Mais opções de Agenda de turmas' }).click()
    await page.getByRole('menuitem', { name: 'Salvar como modelo de página' }).click()
    const dialog = page.getByRole('dialog', { name: 'Salvar como modelo de página' })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('#st-name')).toHaveValue('Agenda de turmas')
    await dialog.locator('#st-name').fill('')
    await expect(dialog.getByRole('button', { name: 'Salvar modelo' })).toBeDisabled()
    await dialog.locator('#st-name').fill('Turmas do sábado')
    await dialog.locator('#st-text').fill('Agenda das turmas, com vagas')
    // Digitar não tira o foco do campo (a janela não se refoca a cada letra).
    await expect(dialog.locator('#st-text')).toBeFocused()
    await dialog.getByRole('button', { name: 'Salvar modelo' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('.gp-notice')).toContainText('“Turmas do sábado” foi salvo')
    await page.locator('.gp-notice').getByRole('link', { name: 'Ver na Nova página' }).click()
    await page.waitForURL(/\/admin\/paginas\/nova/)

    await expect(page.getByRole('heading', { name: 'Seus modelos' })).toBeVisible()
    const saved = page.locator('.gp-savedmodels')
    await expect(saved.locator('.gp-start b')).toHaveText(['Turmas do sábado'])
    await expect(saved.locator('.gp-start')).toContainText('Agenda das turmas, com vagas')
    // O primeiro da tela continua sendo um modelo da equipe.
    await expect(page.locator('#np-name')).toHaveValue('Agenda')
    await saved.getByRole('radio', { name: /Turmas do sábado/ }).click()
    await expect(page.locator('#np-name')).toHaveValue('Agenda de turmas')
    await page.fill('#np-name', 'Turmas de dezembro')
    await page.getByRole('button', { name: 'Criar e começar a editar' }).click()
    await page.waitForURL(/\/admin\/editor\//, { timeout: 60_000 })

    const copy = itemsOf(await latestPage('Turmas de dezembro'))
    // Igual à página salva, com o texto mudado e o título de antes (não vira o nome da nova).
    expect(copy).toEqual(changed)
  })

  test('apagar um modelo salvo; os da equipe não se apagam', async () => {
    await open(page, '/admin/paginas/nova')
    const saved = page.locator('.gp-savedmodels')
    await saved.getByRole('button', { name: 'Apagar o modelo Turmas do sábado' }).click()
    await expect(saved.getByText('Apagar o modelo? As páginas feitas com ele ficam.')).toBeVisible()
    await saved.getByRole('button', { name: 'Cancelar' }).click()
    await expect(saved.locator('.gp-start')).toHaveCount(1)
    await saved.getByRole('button', { name: 'Apagar o modelo Turmas do sábado' }).click()
    await saved.getByRole('button', { name: 'Apagar', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Seus modelos' })).toHaveCount(0)

    const payload = await db()
    const left = await payload.count({
      collection: 'templates',
      where: { fromPage: { equals: true } },
      overrideAccess: true,
    })
    expect(left.totalDocs).toBe(0)
    // A página feita com ele continua.
    expect(await latestPage('Turmas de dezembro')).toBeTruthy()

    const { docs } = await payload.find({
      collection: 'templates',
      where: { key: { equals: 'pagina-sobre' } },
      depth: 0,
      overrideAccess: true,
    })
    const refused = await page.request.delete(`${BASE}/api/templates/${docs[0].id}/salvo`, {
      headers: { Origin: BASE },
    })
    expect(refused.status()).toBe(404)
  })

  test('no celular: selo dentro do cartão compacto, sem rolar para o lado', async ({ browser }) => {
    const phone = await (
      await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' })
    ).newPage()
    await signIn(phone)
    await open(phone, '/admin/paginas/nova')
    const card = phone.locator('.gp-start').first()
    await expect(card.locator('.gp-start__tag')).toBeVisible()
    const [box, tag, mini] = await Promise.all([
      card.boundingBox(),
      card.locator('.gp-start__tag').boundingBox(),
      card.locator('.gp-mini').boundingBox(),
    ])
    expect(tag!.x).toBeGreaterThan(mini!.x + mini!.width)
    expect(tag!.y + tag!.height).toBeLessThanOrEqual(box!.y + box!.height)
    const wide = await phone.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(wide).toBe(false)
    await phone.context().close()
  })
})
