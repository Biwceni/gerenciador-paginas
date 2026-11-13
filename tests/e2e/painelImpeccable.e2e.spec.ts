import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import type { Header } from '../../src/payload-types.js'
import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Ajustes da avaliação Impeccable do painel (rodada 2: Início, Páginas, Nova página, Sua marca,
// Fotos, Menu e rodapé), no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()
const SCREENS = [
  '/admin',
  '/admin/paginas',
  '/admin/paginas/nova',
  '/admin/sua-marca',
  '/admin/fotos',
  '/admin/menu-e-rodape',
]

const pageIds: number[] = []
let photoId: number | null = null
let previousHeader: Header | null = null

// PNG de 1 pixel, que o servidor consegue ler (sem o Storage, a foto fica no próprio servidor).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)

const content = (title: string) => ({
  version: CONTENT_VERSION,
  data: {
    root: { props: {} },
    content: [
      {
        type: 'Features',
        props: {
          id: `Features-${SUFFIX}`,
          menuLabel: '',
          title,
          items: [{ title: 'Um', text: 'Texto.' }],
          style: 'light',
        },
      },
    ],
  },
})

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
}

test.describe.serial('painel: avaliação Impeccable', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    // Uma página no ar com mudança guardada e um rascunho, para o Início ter o que avisar e a lista
    // de Páginas ter linhas com e sem "Ver".
    const live = await payload.create({
      collection: 'pages',
      data: {
        title: `No ar ${SUFFIX}`,
        slug: `no-ar-${SUFFIX}`,
        content: content('Publicado'),
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'pages',
      id: live.id,
      data: { content: content('Mudança guardada') },
      draft: true,
      overrideAccess: true,
    })
    const draft = await payload.create({
      collection: 'pages',
      data: {
        title: `Rascunho ${SUFFIX}`,
        slug: `rascunho-${SUFFIX}`,
        content: content('Rascunho'),
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    pageIds.push(live.id, draft.id)
    // O Menu e rodapé precisa de um item no menu para medir o campo de texto: o banco de testes
    // pode começar vazio.
    previousHeader = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: [{ label: 'Início', link: { kind: 'page' as const, page: live.id } }],
        _status: 'published',
      },
      overrideAccess: true,
    })
    // Sem o Storage (S3) a foto não sobe; o teste de Fotos fica de fora, e o resto segue.
    try {
      const photo = await payload.create({
        collection: 'media',
        data: { alt: 'Foto de teste' },
        file: {
          data: PNG,
          mimetype: 'image/png',
          name: `impeccable-${SUFFIX}.png`,
          size: PNG.length,
        },
        overrideAccess: true,
      })
      photoId = photo.id
    } catch {
      photoId = null
    }

    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    const payload = await panel()
    if (previousHeader) {
      await payload.updateGlobal({
        slug: 'header',
        data: { ...previousHeader, _status: 'published' },
        overrideAccess: true,
      })
    }
    for (const id of pageIds) {
      await payload.delete({ collection: 'pages', id, overrideAccess: true }).catch(() => undefined)
    }
    if (photoId) {
      await payload
        .delete({ collection: 'media', id: photoId, overrideAccess: true })
        .catch(() => undefined)
    }
    await page?.close()
    await cleanupTestUser()
  })

  test('Início: um cartão só de mudanças fora do ar, e a aba diz "Painel"', async () => {
    await open(page, '/admin')
    const card = page.locator('.gp-pending')
    await expect(card).toBeVisible()
    await expect(card.getByRole('heading')).toHaveText('Mudanças que ainda não estão no ar')
    await expect(card).toHaveAttribute('role', 'status')
    await expect(card.locator('li').first()).toContainText('página')
    // Os avisos bege antigos, um por item, sumiram.
    await expect(page.locator('.gp-notice--warn', { hasText: 'fora do ar' })).toHaveCount(0)
    for (const link of await card.getByRole('link').all()) await expect(link).toHaveText('Abrir')
    await expect(page).toHaveTitle(/^Painel \|/)
  })

  test('Páginas: o ⋯ fica alinhado com "Editar", sem linha em cima', async () => {
    await open(page, '/admin/paginas')
    const rows = page.locator('.gp-rows > li').filter({ hasText: String(SUFFIX) })
    await expect(rows).toHaveCount(2)
    for (const row of await rows.all()) {
      const edit = await row.getByRole('link', { name: 'Editar' }).boundingBox()
      const more = row.locator('.gp-more > .gp-btn')
      const box = await more.boundingBox()
      expect(edit && box).toBeTruthy()
      expect(Math.abs(box!.height - edit!.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(box!.y - edit!.y)).toBeLessThanOrEqual(1)
      expect(box!.width).toBeGreaterThanOrEqual(44)
      const border = await row
        .locator('.gp-more')
        .evaluate((el) => getComputedStyle(el).borderTopWidth)
      expect(border).toBe('0px')
    }
  })

  test('Sua marca: "Escolher outras letras" tem a seta, e as abas usam os nomes das seções', async () => {
    await open(page, '/admin/sua-marca')
    const summary = page.locator('.gp-disclosure > summary')
    await expect(summary).toContainText('Escolher outras letras')
    await expect(summary.locator('.gp-disclosure__icon svg')).toHaveCount(1)
    await expect(page.locator('.gp-toc').getByText('Jeito do site')).toBeVisible()
    await expect(page.getByText('Jeito do site', { exact: true }).nth(1)).toBeVisible()
    // A caixa do logo não é mais um cartão dentro do cartão.
    const logo = await page
      .locator('.gp-logopick')
      .evaluate((el) => getComputedStyle(el).borderTopStyle)
    expect(logo).not.toBe('dashed')
    // O nome do negócio nos cartões de Letras: nenhuma palavra cortada na lateral.
    const cut = await page
      .locator('.gp-pair__title')
      .evaluateAll((titles) =>
        titles.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
      )
    expect(cut).toEqual([])
  })

  test('Fotos: filtro "Fotos pequenas"', async () => {
    test.skip(!photoId, 'A foto de teste não subiu (sem o Storage).')
    await open(page, '/admin/fotos')
    await expect(page.getByRole('button', { name: /Fotos pequenas/ })).toBeVisible()
  })

  test('Menu e rodapé: texto de 20 letras sem corte, no computador e no celular', async () => {
    for (const width of [1280, 1440, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, '/admin/menu-e-rodape')
      // Só mede: põe o texto direto no campo, sem avisar o React (nada é salvo).
      const fits = await page
        .locator('.gp-menuitem input')
        .first()
        .evaluate((input: HTMLInputElement) => {
          input.value = 'Encomendas especiais'
          return input.scrollWidth <= input.clientWidth
        })
      expect(fits, `${width}px`).toBe(true)
    }
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('Menu e rodapé: prévia em tamanho real', async () => {
    await open(page, '/admin/menu-e-rodape')
    await page.getByRole('button', { name: 'Ver em tamanho real' }).click()
    await expect(page.getByRole('dialog', { name: 'Prévia em tamanho real' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('celular: todo botão visível tem pelo menos 44px de altura', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of SCREENS) {
      await open(page, path)
      const low = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.gp-btn')]
          .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0)
          .filter((el) => el.getBoundingClientRect().height < 43.5)
          .map(
            (el) =>
              `${el.textContent?.trim() || el.getAttribute('aria-label')} (${Math.round(el.getBoundingClientRect().height)}px)`,
          ),
      )
      expect(low, `${path}: botões baixos`).toEqual([])
    }
  })
})
