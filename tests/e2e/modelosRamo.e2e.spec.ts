import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { parsePageContent } from '../../src/puck/schema.js'
import { templateSeeds } from '../../src/seed/templates/data.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Redesign v3, entrega 6: o Começar monta o site inteiro no ramo (confeitaria), com textos de
// exemplo já com o nome e a cidade, sem foto de banco. Depois de trocar só as fotos, o Publicar
// só lembra dos textos de exemplo. No banco de TEST_DATABASE_URL, sem o Storage (as fotos vão para
// o disco).

const BASE = 'http://localhost:3000'
const NAME = 'Doces da Ana'
const CITY = 'Uberlândia'

// PNG de 1 × 1.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/** Os 2 modelos da confeitaria, se o banco de testes ainda não tiver. Devolve os criados. */
async function seedConfectioneryTemplates(): Promise<number[]> {
  const payload = await getPayload({ config })
  const ids: number[] = []
  for (const seed of templateSeeds.filter((item) => item.key.startsWith('confeitaria-'))) {
    const { totalDocs } = await payload.count({
      collection: 'templates',
      where: { key: { equals: seed.key } },
      overrideAccess: true,
    })
    if (totalDocs) continue
    ids.push(
      (await payload.create({ collection: 'templates', data: seed, overrideAccess: true })).id,
    )
  }
  return ids
}

async function cleanup(templates: number[], photos: number[]) {
  const payload = await getPayload({ config })
  await payload.updateGlobal({
    slug: 'site',
    data: { homepage: null, name: 'Meu site', personality: 'classico', _status: 'published' },
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
  for (const id of templates) {
    await payload.delete({ collection: 'templates', id, overrideAccess: true })
  }
  for (const id of photos) {
    await payload.delete({ collection: 'media', id, overrideAccess: true })
  }
}

/**
 * Troca só as fotos da página inicial, como a pessoa faria no editor: uma foto (com descrição) em
 * cada lugar de foto do banner, da vitrine e do texto com foto.
 */
async function replacePhotos(homepage: number): Promise<number[]> {
  const payload = await getPayload({ config })
  const photo = async (alt: string) =>
    (
      await payload.create({
        collection: 'media',
        data: { alt },
        file: {
          data: PNG,
          mimetype: 'image/png',
          name: `ramo-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`,
          size: PNG.length,
        },
        overrideAccess: true,
      })
    ).id
  const ids: number[] = []
  const draft = await payload.findByID({
    collection: 'pages',
    id: homepage,
    draft: true,
    overrideAccess: true,
  })
  const parsed = parsePageContent(draft.content)
  if (!parsed.success) throw new Error('conteúdo inválido')
  for (const item of parsed.data.data.content) {
    if (item.type === 'Hero' || item.type === 'TextImage') {
      const id = await photo('Mesa com bolos e docinhos da confeitaria')
      ids.push(id)
      item.props.image = { mediaId: id }
    }
    if (item.type === 'Products') {
      for (const product of item.props.items) {
        const id = await photo(`Foto do produto: ${product.name}`)
        ids.push(id)
        product.image = { mediaId: id }
      }
    }
  }
  await payload.update({
    collection: 'pages',
    id: homepage,
    data: { content: parsed.data },
    draft: true,
    overrideAccess: true,
  })
  return ids
}

test.describe.serial('modelos por ramo', () => {
  let page: Page
  let templates: number[] = []
  let photos: number[] = []

  test.beforeAll(async ({ browser }) => {
    await cleanup([], [])
    await seedTestUser()
    templates = await seedConfectioneryTemplates()
    page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  })

  test.afterAll(async () => {
    await cleanup(templates, photos)
    await cleanupTestUser()
  })

  test('o Começar monta o site da confeitaria em menos de 2 minutos', async () => {
    const started = Date.now()
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/admin/comecar`)

    await page.getByRole('radio', { name: /Site da empresa/ }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByRole('radio', { name: /Confeitaria e doces/ }).click()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Sem a cidade, não segue.
    await page.fill('#ob-name', NAME)
    await expect(page.getByRole('button', { name: 'Continuar' })).toBeDisabled()
    await expect(page.getByText('Escreva a cidade para continuar')).toBeVisible()
    await page.fill('#ob-city', CITY)
    await page.fill('#ob-whatsapp', '(34) 99999-0000')
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Os dois modelos sugerem a personalidade do ramo; a prévia já tem o nome e a cidade.
    await expect(page.getByRole('heading', { name: 'Escolha um modelo' })).toBeVisible()
    await expect(page.getByText('Personalidade Vitrine', { exact: true })).toBeVisible()
    await expect(page.getByText(/Personalidade Aconchego/)).toBeVisible()
    const preview = page.frameLocator('.gp-tplsite__preview iframe').first()
    await expect(preview.getByText(`Entregamos em ${CITY}`).first()).toBeVisible()
    await expect(preview.getByText(/Lorem/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Criar meu site' }).click()
    await page.waitForURL(/pronto=1/)
    expect(Date.now() - started).toBeLessThan(120_000)
  })

  test('as páginas e o menu são os do ramo, na personalidade sugerida', async () => {
    const payload = await getPayload({ config })
    const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
    expect(header.items?.map((item) => item.label)).toEqual([
      'Início',
      'Cardápio',
      'Galeria',
      'Encomendas',
    ])
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    expect(site).toMatchObject({ name: NAME, personality: 'vitrine' })
    const footer = await payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true })
    expect(footer.text).toBe(`Bolos, doces e tortas sob encomenda em ${CITY}.`)

    await page.goto(`${BASE}/admin/paginas`)
    for (const title of ['Cardápio', 'Galeria', 'Encomendas']) {
      await expect(page.getByRole('link', { name: title }).first()).toBeVisible()
    }
  })

  test('no editor, o lugar de cada foto pede uma foto sua', async () => {
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    await page.goto(`${BASE}/admin/editor/${site.homepage}`)
    const preview = page.frameLocator('iframe').first()
    await expect(preview.getByText('Escolha uma foto sua do produto').first()).toBeVisible()
    await expect(preview.getByText(/Escolha uma foto sua/).first()).toBeVisible()
    await expect(page.locator('.ed-top__status')).toBeVisible()
  })

  test('trocando só as fotos, o Publicar lembra só dos textos de exemplo', async () => {
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    photos = await replacePhotos(site.homepage as number)

    await page.goto(`${BASE}/admin/editor/${site.homepage}`)
    await expect(
      page
        .frameLocator('iframe')
        .first()
        .getByText(/Escolha uma foto sua/),
    ).toHaveCount(0)
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText(/seções ainda têm texto de exemplo/)).toBeVisible()
    // Nenhum outro aviso: fotos, produtos, WhatsApp e banner estão em ordem.
    await expect(dialog.locator('.ed-check--warn')).toHaveCount(1)
    await expect(dialog.getByText('Todas as fotos têm descrição')).toBeVisible()
  })
})
