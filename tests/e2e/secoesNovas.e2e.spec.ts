import { createRequire } from 'node:module'

import { type Browser, expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Redesign v3, entrega 4: seções novas para vender, no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()
const SLUG = `secoes-novas-${SUFFIX}`
const AXE = createRequire(import.meta.url).resolve('axe-core/axe.min.js')

// PNG de 1 pixel, que o servidor consegue ler.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)

let pageId: number
let editorPageId: number
const photoIds: number[] = []
let previousSite: object | null = null

const whatsapp = { kind: 'whatsapp' }
const button = { label: 'Pedir pelo WhatsApp', link: whatsapp }

/** As seções novas, com fotos da biblioteca. `gallery` e `testimonials`: quantos itens. */
function content(gallery: number, testimonials: number) {
  return {
    version: CONTENT_VERSION,
    data: {
      root: { props: {} },
      content: [
        {
          type: 'Announcement',
          props: {
            id: 'Announcement-a',
            items: [{ text: 'Encomendas de Natal abertas' }, { text: 'Kits presente' }],
            mode: 'move',
            style: 'brand',
          },
        },
        {
          type: 'Products',
          props: {
            id: 'Products-a',
            menuLabel: '',
            title: 'O que sai da nossa cozinha',
            text: 'Tudo sob encomenda.',
            layout: 'three',
            items: [
              { image: { mediaId: photoIds[0] }, name: 'Bolo de pote', price: 'R$ 18', button },
              {
                image: { mediaId: photoIds[1] },
                name: 'Kit presente',
                price: 'sob consulta',
                button,
              },
              { image: null, name: 'Produto sem foto', price: '', button },
            ],
            style: 'light',
          },
        },
        {
          type: 'PriceList',
          props: {
            id: 'PriceList-a',
            menuLabel: '',
            title: 'Preços',
            groups: [
              {
                name: 'Ovos de colher',
                items: [
                  { name: 'Brigadeiro', description: '500 g', price: 'R$ 89' },
                  { name: 'Prestígio', price: 'R$ 69' },
                ],
              },
            ],
          },
        },
        {
          type: 'TextImage',
          props: {
            id: 'TextImage-a',
            menuLabel: '',
            title: 'Nossa história',
            text: 'Começamos em 2019, na cozinha de casa.',
            image: null,
            side: 'right',
            style: 'light',
          },
        },
        {
          type: 'Testimonials',
          props: {
            id: 'Testimonials-a',
            menuLabel: '',
            title: 'O que dizem',
            items: Array.from({ length: testimonials }, (_, i) => ({
              quote: 'O bolo foi o sucesso da festa.',
              name: `Cliente ${i + 1}`,
            })),
            style: 'soft',
          },
        },
        {
          type: 'Gallery',
          props: {
            id: 'Gallery-a',
            menuLabel: '',
            title: 'Nosso dia a dia',
            images: Array.from({ length: gallery }, (_, i) => ({
              mediaId: photoIds[i % photoIds.length],
            })),
            style: 'light',
          },
        },
        {
          type: 'InstagramStrip',
          props: {
            id: 'InstagramStrip-a',
            menuLabel: '',
            title: 'No Instagram',
            images: photoIds.slice(0, 6).map((mediaId) => ({ mediaId })),
          },
        },
      ],
    },
  }
}

async function publishContent(gallery: number, testimonials: number) {
  const payload = await panel()
  await payload.update({
    collection: 'pages',
    id: pageId,
    data: { content: content(gallery, testimonials), _status: 'published' },
    overrideAccess: true,
  })
}

async function visit(browser: Browser, width: number) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    // Parada: o axe mede as cores das peças inteiras, não no meio da animação.
    reducedMotion: 'reduce',
  })
  const visitor = await context.newPage()
  await visitor.goto(`${BASE}/${SLUG}`)
  return { context, visitor }
}

/** Itens sozinhos na última linha de uma lista (topo diferente e menos de 60% da largura). */
const orphans = (page: Page, selector: string) =>
  page.locator(selector).evaluate((list) => {
    const items = [...list.children]
    if (items.length < 2) return false
    const last = items[items.length - 1].getBoundingClientRect()
    const before = items[items.length - 2].getBoundingClientRect()
    const box = list.getBoundingClientRect()
    return Math.abs(last.top - before.top) > 2 && last.width < box.width * 0.6
  })

test.describe.serial('seções novas (entrega 4)', () => {
  test.beforeAll(async () => {
    await seedTestUser()
    const payload = await panel()
    previousSite = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    await payload.updateGlobal({
      slug: 'site',
      data: {
        social: { instagram: '@mrs.kluana' },
        contact: { whatsapp: '(11) 99999-0000' },
        _status: 'published',
      },
      overrideAccess: true,
    })
    for (let i = 0; i < 12; i++) {
      const photo = await payload.create({
        collection: 'media',
        data: { alt: `Doce número ${i + 1}` },
        file: { data: PNG, mimetype: 'image/png', name: `secoes-${i}-${SUFFIX}.png`, size: 68 },
        overrideAccess: true,
      })
      photoIds.push(photo.id)
    }
    const created = await payload.create({
      collection: 'pages',
      data: {
        title: `Seções novas ${SUFFIX}`,
        slug: SLUG,
        content: content(7, 3),
        _status: 'published',
      },
      overrideAccess: true,
    })
    pageId = created.id
    const editorPage = await payload.create({
      collection: 'pages',
      data: {
        title: `Editor seções novas ${SUFFIX}`,
        slug: `${SLUG}-editor`,
        content: { version: CONTENT_VERSION, data: { root: { props: {} }, content: [] } },
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    editorPageId = editorPage.id
  })

  test.afterAll(async () => {
    const payload = await panel()
    if (previousSite) {
      await payload.updateGlobal({
        slug: 'site',
        data: { ...previousSite, _status: 'published' },
        overrideAccess: true,
      })
    }
    for (const id of [pageId, editorPageId]) {
      if (id) {
        await payload.delete({
          collection: 'pages',
          id,
          overrideAccess: true,
          context: { seedRecreate: true },
        })
      }
    }
    for (const id of photoIds) {
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    }
    await cleanupTestUser()
  })

  for (const width of [1440, 390]) {
    test(`site em ${width}: seções novas inteiras, sem rolagem lateral e no axe`, async ({
      browser,
    }) => {
      const { context, visitor } = await visit(browser, width)

      // Faixa: o aviso inteiro uma vez para o leitor de tela; parada com menos movimento.
      const note = visitor.getByRole('note', {
        name: 'Aviso: Encomendas de Natal abertas. Kits presente',
      })
      await expect(note).toBeAttached()
      await expect(visitor.locator('.announce__track')).toBeHidden()
      await expect(visitor.locator('.announce__still')).toBeVisible()

      // Vitrine: produto sem foto fica fora; o WhatsApp leva a mensagem com o nome.
      await expect(visitor.locator('.product')).toHaveCount(2)
      await expect(visitor.getByText('Produto sem foto')).toHaveCount(0)
      await expect(
        visitor.getByRole('link', { name: 'Pedir pelo WhatsApp: Bolo de pote' }),
      ).toHaveAttribute('href', /text=Ol%C3%A1%21\+Quero\+saber\+sobre%3A\+Bolo\+de\+pote/)

      // Cardápio com números alinhados.
      await expect(visitor.locator('.price-item__price').first()).toHaveCSS(
        'font-variant-numeric',
        'tabular-nums',
      )

      // Texto com foto sem foto: o texto no centro.
      await expect(visitor.locator('.text-image--solo')).toBeVisible()

      // Instagram: o @ das Configurações e o botão.
      await expect(visitor.getByRole('link', { name: /Seguir no Instagram/ })).toHaveAttribute(
        'href',
        'https://instagram.com/mrs.kluana',
      )

      const overflow = await visitor.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)

      await visitor.addScriptTag({ path: AXE })
      const violations = await visitor.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: { run: (...args: unknown[]) => Promise<{ violations: { id: string }[] }> }
          }
        ).axe
        const result = await axe.run(document.querySelector('main'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
        })
        return result.violations.map((violation: { id: string }) => violation.id)
      })
      expect(violations).toEqual([])

      await visitor.screenshot({
        path: test.info().outputPath(`secoes-novas-${width}.png`),
        fullPage: true,
      })
      await context.close()
    })
  }

  test('a faixa corre no site e para com o botão (sem pedido de menos movimento)', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const visitor = await context.newPage()
    await visitor.goto(`${BASE}/${SLUG}`)
    const track = visitor.locator('.announce__track')
    await expect(track).toBeVisible()
    await expect(track).toHaveCSS('animation-play-state', 'running')
    await visitor.getByRole('checkbox', { name: 'Parar a faixa de aviso' }).check()
    // Com o botão marcado (e o foco nele), a faixa fica parada.
    await visitor.mouse.move(0, 800)
    await expect(track).toHaveCSS('animation-play-state', 'paused')
    await context.close()
  })

  test('galeria de 1 a 12 fotos e depoimentos de 1 a 6, sem item sozinho', async ({ browser }) => {
    for (let count = 1; count <= 12; count++) {
      const testimonials = Math.min(count, 6)
      await publishContent(count, testimonials)
      for (const width of [1440, 390]) {
        const { context, visitor } = await visit(browser, width)
        await expect(visitor.locator('.gallery > li')).toHaveCount(count)
        expect(await orphans(visitor, '.gallery'), `${count} fotos em ${width}`).toBe(false)
        await expect(visitor.locator('.testimonials > li')).toHaveCount(testimonials)
        if (width === 1440) {
          expect(await orphans(visitor, '.testimonials'), `${testimonials} depoimentos`).toBe(false)
        }
        await visitor.locator('.gallery').screenshot({
          path: test.info().outputPath(`galeria-${count}-${width}.png`),
        })
        await visitor.locator('.testimonials').screenshot({
          path: test.info().outputPath(`depoimentos-${testimonials}-${width}.png`),
        })
        await context.close()
      }
    }
    // 3 depoimentos ficam em 3 colunas no computador.
    await publishContent(7, 3)
    const { context, visitor } = await visit(browser, 1440)
    const tops = await visitor
      .locator('.testimonials > li')
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
    await context.close()
  })

  test('editor: insere a Vitrine pela lista, avisa o que falta e publica', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.endsWith('/login'))
    await page.goto(`${BASE}/admin/editor/${editorPageId}`)

    const item = page.locator('.ed-palitem:not([inert])', { hasText: 'Vitrine de produtos' })
    await expect(item).toContainText('Foto, nome, preço e botão de pedir', { timeout: 120_000 })
    await item.click()

    // Na prévia, o aviso no lugar da foto que falta.
    const preview = page.frameLocator('iframe')
    await expect(preview.getByText('Escolha a foto do produto').first()).toBeVisible()
    // Arrumação por miniatura.
    const layout = page.getByRole('radiogroup', { name: 'Arrumação' })
    await expect(layout.getByRole('radio', { name: /3 por linha/ })).toBeChecked()
    await layout.getByRole('radio', { name: /Lista com foto/ }).check()
    await expect(preview.locator('.products--list')).toBeVisible()

    // O Publicar avisa os produtos sem foto e publica mesmo assim.
    const dialog = page.getByRole('dialog')
    await expect(async () => {
      await page.getByRole('button', { name: 'Publicar', exact: true }).click()
      await expect(dialog).toBeVisible({ timeout: 1000 })
    }).toPass()
    await expect(dialog).toContainText('3 produtos estão sem foto')
    await dialog.getByRole('button', { name: 'Publicar mesmo assim' }).click()
    await expect(dialog).toContainText('Pronto, a página está no ar')

    const payload = await panel()
    const doc = await payload.findByID({
      collection: 'pages',
      id: editorPageId,
      depth: 0,
      overrideAccess: true,
    })
    expect(JSON.stringify(doc.content)).toContain('"type":"Products"')
    expect(JSON.stringify(doc.content)).toContain('"layout":"list"')
  })
})
