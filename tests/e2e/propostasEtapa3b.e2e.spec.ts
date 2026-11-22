import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 3b: C3 (destaques mais flexíveis),
// B2 (cartão da Vitrine) e B3 (categorias, busca e ordem). No banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: { collection: 'pages' | 'media'; id: number }[] = []
let count = 0

const whats = (label: string) => ({ label, link: { kind: 'whatsapp' } })

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(content: unknown[], status: 'draft' | 'published' = 'draft') {
  const payload = await getPayload({ config })
  const slug = `etapa3b-${SUFFIX}-${++count}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title: `Etapa 3b ${count}`, slug, content: wrap(content), _status: status },
    draft: status === 'draft',
    overrideAccess: true,
  })
  created.push({ collection: 'pages', id: doc.id })
  return { id: doc.id, slug }
}

/** Foto de cor lisa no tamanho dado (em pé ou deitada). */
async function createPhoto(name: string, width: number, height: number, color: string) {
  const data = await sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer()
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'media',
    data: { alt: `Foto ${name}` },
    file: { data, mimetype: 'image/png', name: `${name}-${SUFFIX}.png`, size: data.length },
    overrideAccess: true,
  })
  created.push({ collection: 'media', id: doc.id })
  return doc.id
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

const preview = (page: Page) => page.frameLocator('.ed-root iframe').first()
const sections = (page: Page) =>
  preview(page).locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')
const fields = (page: Page) => page.locator('form[class*="_PuckFields_"]:visible')

async function openEditor(page: Page, id: number, total: number) {
  await page.goto(`${BASE}/admin/editor/${id}`)
  await expect(sections(page)).toHaveCount(total, { timeout: 180_000 })
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
  await page.waitForTimeout(1500)
}

async function pick(page: Page, index: number) {
  const target = sections(page).nth(index)
  await target.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await target.click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(800)
}

async function openSite(page: Page, slug: string) {
  await page.goto(`${BASE}/${slug}`)
  await page.waitForLoadState('load')
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

const cats = ['Vitaminas', 'Higiene', 'Mamãe e bebê', 'Ofertas']

const product = (photo: number, index: number, extra: Record<string, unknown> = {}) => ({
  image: { mediaId: photo },
  name: `Item ${String(index + 1).padStart(2, '0')}`,
  text: '',
  price: `R$ ${10 + index},00`,
  category: cats[index % cats.length],
  button: whats('Pedir'),
  ...extra,
})

const vitrine = (photo: number, total: number) => ({
  type: 'Products',
  props: {
    id: 'Products-3b',
    menuLabel: '',
    title: 'Vitrine',
    text: '',
    layout: 'three',
    style: 'light',
    anim: 'site',
    items: Array.from({ length: total }, (_, index) =>
      product(
        photo,
        index,
        index === 0
          ? {
              badge: '-30%',
              oldPrice: 'R$ 99,00',
              details: 'Detalhes do primeiro item.',
              photos: [{ image: { mediaId: photo } }],
            }
          : index === 1
            ? { status: 'soldout' }
            : {},
      ),
    ),
  },
})

const destaques = (photo: number) => ({
  type: 'Features',
  props: {
    id: 'Features-3b',
    menuLabel: '',
    title: 'Destaques',
    marker: 'icon',
    steps: 'grid',
    style: 'light',
    anim: 'site',
    items: [
      { title: 'Primeiro', text: 'Frase.', icon: 'check', photo: null },
      {
        title: 'Segundo',
        text: 'Frase.',
        icon: 'truck',
        photo: { mediaId: photo },
        button: { label: '', link: { kind: 'url', url: 'https://example.com/destaque' } },
      },
    ],
  },
})

test.describe.serial('Etapa 3b: vitrine e destaques', () => {
  let photo = 0

  test.beforeAll(async () => {
    await seedTestUser()
    photo = await createPhoto('produto', 1000, 1000, '#d9c7a0')
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    for (const item of created.reverse()) {
      await payload
        .delete({
          collection: item.collection,
          id: item.id,
          overrideAccess: true,
          context: { seedRecreate: true },
        })
        .catch(() => undefined)
    }
    await cleanupTestUser()
  })

  test('B3: categoria no endereço, filtro, busca sem resultado e ordem por preço', async ({
    page,
  }) => {
    const { slug } = await createPage([vitrine(photo, 14)], 'published')
    await page.goto(`${BASE}/${slug}?categoria=higiene`)
    await page.waitForLoadState('load')
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
    const list = page.locator('.products > li')
    await expect(page.getByRole('button', { name: 'Higiene', pressed: true })).toBeVisible()
    await expect(list).toHaveCount(4) // 02, 06, 10 e 14

    await page.getByRole('button', { name: 'Mamãe e bebê' }).click()
    await expect(page).toHaveURL(/categoria=mamae-e-bebe/)
    await expect(list).toHaveCount(3)
    await page.getByRole('button', { name: 'Todos' }).click()
    await expect(page).not.toHaveURL(/categoria=/)
    await expect(list).toHaveCount(14)

    // 14 itens: busca e "Ordenar" aparecem.
    const search = page.getByRole('searchbox', { name: 'Buscar nesta lista' })
    await search.fill('item 1')
    await expect(list).toHaveCount(6) // 01 e 10 a 14
    await search.fill('xpto')
    await expect(page.locator('.products-empty')).toContainText('Nada com “xpto”.')
    await page.getByRole('button', { name: 'Ver todos' }).click()
    await expect(search).toHaveValue('')
    await expect(list).toHaveCount(14)

    await page.getByLabel('Ordenar').selectOption('newest')
    await expect(list.first().locator('.product__name')).toHaveText('Item 14')
  })

  test('B2: selo, preço antigo, esgotado sem botão e "Mais detalhes" numa janela que fecha no Esc', async ({
    page,
  }) => {
    const { slug } = await createPage([vitrine(photo, 3)], 'published')
    await openSite(page, slug)
    const first = page.locator('.products > li').first()
    await expect(first.locator('.product__photo .product__badge')).toHaveText('-30%')
    await expect(first.locator('.product__body > .product__price .product__old')).toContainText('R$ 99,00')
    const soldOut = page.locator('.products > li').nth(1)
    await expect(soldOut.locator('.product__body > .product__status')).toHaveText('Esgotado')
    await expect(soldOut.locator('a.product__link')).toHaveCount(0)

    const more = page.getByRole('button', { name: 'Mais detalhes: Item 01' })
    await more.click()
    const dialog = page.locator('.product-dialog[open]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Detalhes do primeiro item.')
    await expect(dialog.locator('.product-dialog__photo')).toHaveCount(2)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(more).toBeFocused()
  })

  test('C3: link do destaque leva o item todo; no editor, a busca de ícones acha "vacina"', async ({
    page,
  }) => {
    const { id, slug } = await createPage([destaques(photo)], 'published')
    await openSite(page, slug)
    const link = page.getByRole('link', { name: /Saiba mais.*Segundo/ })
    await expect(link).toHaveAttribute('href', 'https://example.com/destaque')
    await expect(page.locator('.features__link')).toHaveCount(1)

    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    const panel = fields(page)
    await panel.locator('[class*="ArrayFieldItem-summary"]').first().click()
    await page.waitForTimeout(600)
    await panel.getByRole('button', { name: 'Trocar ícone' }).click()
    await panel.getByLabel('Buscar ícone').fill('vacina')
    const choice = panel.getByRole('radio', { name: 'Vacina' })
    await expect(panel.getByRole('radiogroup', { name: 'Ícone' }).getByRole('radio')).toHaveCount(1)
    await choice.check()
    await expect
      .poll(async () => ((await savedContent(id))[0].props.items as { icon: string }[])[0].icon, {
        timeout: 20_000,
      })
      .toBe('syringe')
  })

  test('C3 no editor: "Foto grande" aparece como marcador, e o link do item abre os campos', async ({
    page,
  }) => {
    const { id } = await createPage([destaques(photo)])
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    const panel = fields(page)
    await panel.getByRole('radio', { name: /Foto grande/ }).check()
    await expect
      .poll(async () => (await savedContent(id))[0].props.marker, { timeout: 20_000 })
      .toBe('cover')
    await expect(preview(page).locator('.features--cover')).toBeVisible()
    await panel.locator('[class*="ArrayFieldItem-summary"]').first().click()
    await page.waitForTimeout(600)
    await panel.getByRole('button', { name: /Pôr um link/ }).click()
    await expect(panel.getByText('Texto do link (vazio: “Saiba mais”)')).toBeVisible()
  })
})
