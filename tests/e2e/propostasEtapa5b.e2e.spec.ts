import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { showPageTitles, type SiteShow } from '../../src/lib/siteShows.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 5b-1: F1 (o Começar pergunta o que
// o site mostra) e A8 (o site anterior fica guardado e dá para voltar). No banco de
// TEST_DATABASE_URL: apaga as páginas e as cópias de lá no começo e no fim.

const BASE = 'http://localhost:3000'

const LABELS: Record<SiteShow, string> = {
  products: 'Produtos',
  services: 'Serviços',
  units: 'Unidades',
  agenda: 'Agenda',
  team: 'Equipe',
  files: 'Envie um arquivo',
  contact: 'Contato',
}

// Os 10 nichos montados à mão na série de nichos, agora pelo que cada um mostra.
const NICHES: { name: string; shows: SiteShow[] }[] = [
  { name: 'Barbearia Navalha', shows: ['services', 'units', 'team', 'contact'] },
  { name: 'Levori Veículos', shows: ['products', 'contact'] },
  { name: 'Conveniência Bucci', shows: ['products', 'units'] },
  { name: 'Lumiar Odontologia', shows: ['services', 'team', 'contact'] },
  { name: 'GFarma Manipulação', shows: ['products', 'units', 'files', 'contact'] },
  { name: 'Silógica Sistemas', shows: ['services', 'contact'] },
  { name: 'Vale Verde FC', shows: ['products', 'agenda', 'team'] },
  { name: 'Nexo Games', shows: ['products', 'agenda'] },
  { name: 'Alameda Imóveis', shows: ['products', 'contact'] },
  { name: 'Farol Drogarias', shows: ['products', 'units', 'files', 'contact'] },
]

async function db() {
  return getPayload({ config })
}

async function cleanup() {
  const payload = await db()
  await payload.updateGlobal({
    slug: 'site',
    data: {
      homepage: null,
      privacyPage: null,
      name: 'Meu site',
      social: {},
      seoDescription: null,
      start: { shows: [] },
      _status: 'published',
    },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'header',
    data: { items: [], button: { label: null }, _status: 'published' },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'footer',
    data: { _status: 'published' },
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
    collection: 'site-backups',
    where: { id: { exists: true } },
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

async function openStart(page: Page) {
  await page.goto(`${BASE}/admin/comecar`)
  await page.waitForLoadState('load')
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

const next = (page: Page) => page.getByRole('button', { name: 'Continuar' }).click()

/** O Começar inteiro pela tela, até Revisar. */
async function walk(page: Page, name: string, shows: SiteShow[], look = 'Sóbrio') {
  await openStart(page)
  await page.getByRole('radio', { name: /Site da empresa/ }).click()
  await next(page)
  await page.fill('#ob-name', name)
  await page.fill('#ob-city', 'Lavras')
  await next(page)
  await expect(
    page.getByRole('heading', { name: 'O que o seu site precisa mostrar?' }),
  ).toBeVisible()
  await expect(page.getByText(/Marque quantos quiser/)).toBeVisible()
  for (const box of await page.getByRole('checkbox').all()) {
    if ((await box.getAttribute('aria-checked')) === 'true') await box.click()
  }
  for (const show of shows) {
    await page.getByRole('checkbox', { name: new RegExp(`^${LABELS[show]}`) }).click()
  }
  // A lista do que vai ser criado acompanha as marcações.
  await expect(page.locator('.gp-showpages li')).toHaveText(showPageTitles(shows))
  await next(page)
  await expect(page.getByRole('heading', { name: 'Escolha o visual' })).toBeVisible()
  if (look !== 'Sóbrio') {
    await page.getByRole('button', { name: new RegExp(`^${look}`) }).click()
    await page.getByRole('button', { name: `Usar o visual ${look}` }).click()
  }
  await next(page)
  await expect(page.getByRole('heading', { name: /Confira antes de/ })).toBeVisible()
}

async function finish(page: Page) {
  await page.getByRole('button', { name: /Criar meu site|Trocar meu site/ }).click()
  await page.waitForURL(/pronto=1/, { timeout: 120_000 })
}

async function headerLabels() {
  const payload = await db()
  const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
  return header.items?.map((item) => item.label) ?? []
}

test.describe
  .serial('Etapa 5b-1: o Começar pelo que o site mostra e o site anterior guardado', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await cleanup()
    await seedTestUser()
    page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
    await signIn(page)
  })

  test.afterAll(async () => {
    await cleanup()
    await cleanupTestUser()
  })

  test('nada marcado: um site de uma página só, com Sobre e Contato', async () => {
    await walk(page, 'Casa Primeira', [])
    await expect(page.locator('.gp-review')).toContainText('1 página nova')
    // Primeiro site: nada a guardar, então nada sobre o site anterior.
    await expect(page.getByText('O que sai do site anterior?')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Criar meu site' })).toBeVisible()
    await finish(page)
    expect(await headerLabels()).toEqual(['Início'])
    const payload = await db()
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.start?.shows ?? []).toEqual([])
    const { docs } = await payload.find({
      collection: 'pages',
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    const types = (docs[0].content as { data: { content: { type: string }[] } }).data.content.map(
      (item) => item.type,
    )
    expect(types).toEqual(expect.arrayContaining(['TextImage', 'Contact']))
    const backups = await payload.count({ collection: 'site-backups', overrideAccess: true })
    expect(backups.totalDocs).toBe(0)
  })

  test('tudo marcado, com outro nome: o que sai já vem marcado e o site anterior fica guardado', async () => {
    const payload = await db()
    await payload.updateGlobal({
      slug: 'site',
      data: {
        social: { instagram: '@casaprimeira' },
        seoDescription: 'Descrição da casa primeira',
        _status: 'published',
      },
      overrideAccess: true,
    })
    const all = Object.keys(LABELS) as SiteShow[]
    await walk(page, 'Casa Completa', all, 'Impacto')
    const clear = page.locator('.gp-clearlist')
    await expect(clear.getByText('O que sai do site anterior?')).toBeVisible()
    await expect(clear.getByRole('checkbox', { name: /Instagram/ })).toBeChecked()
    await expect(clear.getByRole('checkbox', { name: /Descrição no Google/ })).toBeChecked()
    // Mantém a descrição: desmarcada, continua.
    await clear.getByRole('checkbox', { name: /Descrição no Google/ }).uncheck()
    await expect(
      page.getByText(
        'O site anterior fica guardado em Páginas › Arquivadas. Dá para voltar a qualquer momento.',
      ),
    ).toBeVisible()
    await finish(page)

    expect(await headerLabels()).toEqual(showPageTitles(all))
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site).toMatchObject({ name: 'Casa Completa', personality: 'vitrine' })
    expect(site.social?.instagram ?? null).toBeNull()
    expect(site.seoDescription).toBe('Descrição da casa primeira')
    expect(site.start?.shows).toEqual(all)
    // "Envie um arquivo" ganhou o formulário com o arquivo obrigatório.
    const { docs: forms } = await payload.find({
      collection: 'forms',
      where: { title: { equals: 'Envie um arquivo' } },
      depth: 0,
      overrideAccess: true,
    })
    const file = forms[0]?.fields?.find((field) => field.blockType === 'file')
    expect(file).toMatchObject({ required: true })
    const { docs: backups } = await payload.find({
      collection: 'site-backups',
      depth: 0,
      overrideAccess: true,
    })
    expect(backups.map((backup) => backup.name)).toEqual(['Casa Primeira'])
  })

  test('trocar 3 vezes seguidas e voltar para o primeiro', async () => {
    await walk(page, 'Troca Um', ['services', 'contact'])
    await finish(page)
    await walk(page, 'Troca Dois', ['agenda'], 'Revista')
    await finish(page)
    await walk(page, 'Troca Três', ['products', 'units'])
    await finish(page)
    expect(await headerLabels()).toEqual(['Início', 'Produtos', 'Unidades'])

    await page.goto(`${BASE}/admin/paginas`)
    await page.locator('.gp-archived summary').click()
    const list = page.locator('.gp-sitebackups')
    await expect(list.locator('.gp-sitebackup b')).toHaveText([
      'Troca Dois',
      'Troca Um',
      'Casa Completa',
      'Casa Primeira',
    ])
    await list
      .locator('.gp-sitebackup', { hasText: 'Casa Primeira' })
      .getByRole('button', { name: 'Voltar para este site' })
      .click()
    await page.getByRole('dialog').getByRole('button', { name: 'Voltar para este site' }).click()
    await expect(page.locator('.gp-notice')).toContainText(
      '“Casa Primeira” voltou a ser o seu site',
    )

    const payload = await db()
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.name).toBe('Casa Primeira')
    expect(site.social?.instagram).toBe('@casaprimeira')
    expect(await headerLabels()).toEqual(['Início'])
    // A inicial voltou no endereço de antes; o Troca Três agora é uma cópia, e a usada saiu.
    const home = await payload.findByID({
      collection: 'pages',
      id: site.homepage as number,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })
    expect(home).toMatchObject({ slug: 'inicio', archived: false })
    await page.reload()
    await page.locator('.gp-archived summary').click()
    await expect(page.locator('.gp-sitebackup b')).toHaveText([
      'Troca Três',
      'Troca Dois',
      'Troca Um',
      'Casa Completa',
    ])
  })

  test('os 10 nichos da série montam pelo que cada um mostra', async () => {
    for (const niche of NICHES) {
      const response = await page.request.post(`${BASE}/api/templates/montar`, {
        data: { name: niche.name, city: 'Lavras', shows: niche.shows, personality: 'papel' },
        // Sem a origem, o Payload ignora o cookie (proteção contra outro site fazendo o pedido).
        headers: { Origin: BASE },
      })
      expect(response.status(), niche.name).toBe(200)
      expect(await headerLabels(), niche.name).toEqual(showPageTitles(niche.shows))
    }
    const payload = await db()
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site.name).toBe('Farol Drogarias')
    // Nenhum endereço repetido virou "-2": cada troca libera os endereços da anterior.
    const { docs } = await payload.find({
      collection: 'pages',
      where: { archived: { not_equals: true } },
      depth: 0,
      draft: true,
      pagination: false,
      overrideAccess: true,
    })
    expect(docs.map((doc) => doc.slug).sort()).toEqual(
      ['inicio', 'produtos', 'unidades', 'envie-um-arquivo', 'contato'].sort(),
    )
    await page.goto(`${BASE}/`)
    await expect(page.locator('header').getByText('Envie um arquivo').first()).toBeVisible()
  })

  test('no celular: cartões compactos, Continuar sempre à mão e "Passo 5 de 5 · Revisar"', async ({
    browser,
  }) => {
    const phone = await (
      await browser.newContext({ viewport: { width: 390, height: 844 } })
    ).newPage()
    await signIn(phone)
    await walk(phone, 'Casa no Celular', ['products', 'team', 'contact'])
    await expect(phone.getByText('Passo 5 de 5 · Revisar')).toBeVisible()
    await expect(phone.locator('.gp-stepnames')).toBeHidden()
    const nav = phone.locator('.gp-obnav')
    const box = await nav.boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(844 + 1)
    expect(
      await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await phone.getByRole('button', { name: 'Voltar', exact: true }).click()
    await phone.getByRole('button', { name: 'Voltar', exact: true }).click()
    // Um cartão por linha, com o ✓ dentro.
    const cards = phone.locator('.gp-showcard')
    const [a, b] = [await cards.nth(0).boundingBox(), await cards.nth(1).boundingBox()]
    expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1)
    await expect(
      phone.locator('.gp-showcard[aria-checked="true"] .gp-showcard__check svg'),
    ).toHaveCount(3)
    await phone.context().close()
  })
})
