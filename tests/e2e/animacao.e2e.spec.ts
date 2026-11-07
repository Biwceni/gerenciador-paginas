import { type Browser, expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { seedTestUser, testUser } from '../helpers/seedUser'

// Redesign v3, entrega 2: animação do site e de cada seção, no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()
const SLUG = `animacao-${SUFFIX}`

// PNG de 1 pixel, que o servidor consegue ler.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)

let pageId: number
const photoIds: number[] = []
let previous: object | null = null

async function publishMotion(motion: 'nenhum' | 'suave' | 'marcante') {
  const payload = await panel()
  await payload.updateGlobal({
    slug: 'site',
    data: { motion, _status: 'published' },
    overrideAccess: true,
  })
}

async function draftContent() {
  const payload = await panel()
  const doc = await payload.findByID({
    collection: 'pages',
    id: pageId,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  return { content: JSON.stringify(doc.content), updatedAt: doc.updatedAt }
}

async function visit(browser: Browser, options: Parameters<Browser['newContext']>[0] = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options })
  const visitor = await context.newPage()
  await visitor.goto(`${BASE}/${SLUG}`)
  return { context, visitor }
}

const sectionsIn = (page: Page) => page.frameLocator('iframe').locator('main [data-puck-component]')

/** Escolhe a seção clicando na margem dela, onde não tem texto (como no e2e do editor). */
async function selectSection(page: Page, index: number) {
  const section = sectionsIn(page).nth(index)
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  const box = await section.boundingBox()
  if (!box) throw new Error('seção fora da tela')
  const frame = await page.locator('iframe').boundingBox()
  await page.mouse.click(box.x + 8, Math.max(box.y, frame?.y ?? 0) + 40)
}

test.describe.serial('animação do site e das seções', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    for (const name of ['a', 'b']) {
      const photo = await payload.create({
        collection: 'media',
        data: { alt: `Foto ${name}` },
        file: { data: PNG, mimetype: 'image/png', name: `anim-${name}-${SUFFIX}.png`, size: 68 },
        overrideAccess: true,
      })
      photoIds.push(photo.id)
    }
    const created = await payload.create({
      collection: 'pages',
      data: {
        title: `Animação ${SUFFIX}`,
        slug: SLUG,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Hero',
                props: {
                  id: 'Hero-a',
                  title: 'Bolos caseiros feitos com carinho',
                  highlight: 'com carinho',
                  text: 'Encomendas pelo WhatsApp.',
                  image: null,
                  button: null,
                  style: 'soft',
                  align: 'left',
                  height: 'normal',
                },
              },
              {
                type: 'Features',
                props: {
                  id: 'Features-a',
                  menuLabel: '',
                  title: 'Por que a gente',
                  marker: 'none',
                  items: ['Massa', 'Recheio', 'Entrega'].map((title) => ({
                    title,
                    text: 'Uma frase curta.',
                    icon: 'check',
                  })),
                  style: 'light',
                },
              },
              {
                type: 'Gallery',
                props: {
                  id: 'Gallery-a',
                  menuLabel: '',
                  title: 'Fotos',
                  images: photoIds.map((mediaId) => ({ mediaId })),
                  style: 'light',
                },
              },
              {
                type: 'RichText',
                props: {
                  id: 'RichText-a',
                  menuLabel: '',
                  title: 'Nossa história',
                  body: `<p>${'Texto para a página ter o que rolar. '.repeat(80)}</p>`,
                  style: 'light',
                },
              },
              {
                type: 'CallToAction',
                props: {
                  id: 'CallToAction-a',
                  menuLabel: '',
                  title: 'Vamos conversar?',
                  text: 'Chame a gente.',
                  button: { label: 'Chamar', link: { kind: 'whatsapp' } },
                  style: 'brand',
                },
              },
            ],
          },
        },
        _status: 'published',
      },
      overrideAccess: true,
    })
    pageId = created.id
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    previous = {
      ...(site.name ? { name: site.name } : {}),
      motion: site.motion ?? 'suave',
      contact: site.contact ?? {},
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        // Publicar as Configurações pede o nome do negócio (banco de testes limpo não tem).
        name: site.name || 'Doces da Vila',
        motion: 'marcante',
        contact: { ...site.contact, whatsapp: '(31) 99999-0000' },
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
        slug: 'site',
        data: { ...previous, _status: 'published' },
        overrideAccess: true,
      })
    }
    if (pageId) {
      await payload.delete({
        collection: 'pages',
        id: pageId,
        overrideAccess: true,
        context: { seedRecreate: true },
      })
    }
    for (const id of photoIds)
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    await page?.close()
  })

  test('a Animação do site vale nas seções em "Igual ao site"', async ({ browser }) => {
    const { context, visitor } = await visit(browser)
    await expect(visitor.locator('.hero')).toHaveClass(/anim--linhas/)
    await expect(visitor.locator('.section', { has: visitor.locator('.features') })).toHaveClass(
      /anim--cascata/,
    )
    await expect(visitor.locator('.section', { has: visitor.locator('.gallery') })).toHaveClass(
      /anim--sequencia/,
    )
    await expect(visitor.locator('.section', { has: visitor.locator('.cta') })).toHaveClass(
      /anim--subir/,
    )
    // O título sobe em linhas, com o destaque inteiro.
    await expect(visitor.locator('.hero__title .line')).toHaveCount(2)
    await expect(visitor.locator('.hero__title em')).toHaveText('com carinho')
    const rise = await visitor
      .locator('.hero__title .line > span')
      .first()
      .evaluate((element) => getComputedStyle(element).animationName)
    expect(rise).toBe('site-rise')
    // Ao rolar até a seção, os itens terminam inteiros e no lugar.
    const item = visitor.locator('.features__item').last()
    await item.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await expect.poll(() => item.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
    await context.close()

    await publishMotion('nenhum')
    const still = await visit(browser)
    await expect(still.visitor.locator('.hero')).toBeVisible()
    await expect(still.visitor.locator('.anim')).toHaveCount(0)
    await still.context.close()
  })

  test('com menos movimento, nada se move: a seção só esmaece', async ({ browser }) => {
    await publishMotion('marcante')
    const { context, visitor } = await visit(browser, { reducedMotion: 'reduce' })
    const hero = visitor.locator('.hero')
    await expect(hero).toHaveClass(/anim--linhas/)
    const styles = await hero.evaluate((element) => ({
      name: getComputedStyle(element).animationName,
      duration: getComputedStyle(element).animationDuration,
      line: getComputedStyle(element.querySelector('.line > span')!).animationName,
    }))
    expect(styles).toEqual({ name: 'site-fade-only', duration: '0.35s', line: 'none' })
    await context.close()
  })

  test('sem JavaScript, a página aparece inteira', async ({ browser }) => {
    const { context, visitor } = await visit(browser, { javaScriptEnabled: false })
    await expect(visitor.locator('.hero__title')).toBeVisible()
    await visitor.waitForTimeout(1500)
    expect(
      await visitor
        .locator('.hero__inner')
        .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe('1')
    const cta = visitor.locator('.cta h2')
    await cta.evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await expect(cta).toBeVisible()
    await expect
      .poll(() => cta.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(0)
    await context.close()
  })

  test('no editor: muda a animação da seção, "Ver a animação" não salva nada, e publica', async ({
    browser,
  }) => {
    await publishMotion('nenhum')
    await page.goto(`${BASE}/admin/editor/${pageId}`)
    await expect(sectionsIn(page)).toHaveCount(5, { timeout: 120_000 })
    // A prévia não anima sozinha.
    const preview = page.frameLocator('iframe')
    await expect(preview.locator('body')).not.toHaveAttribute('data-animate', /.*/)

    await selectSection(page, 1)
    const field = page.getByRole('radiogroup', { name: 'Animação' })
    await expect(field).toBeVisible()
    await expect(field.getByRole('radio', { name: /Igual ao site/ })).toBeChecked()
    await expect(field).toContainText('Nenhuma: sem animação')

    await field.getByRole('radio', { name: /Um depois do outro/ }).check()
    await expect
      .poll(async () => (await draftContent()).content, { timeout: 30_000 })
      .toContain('"anim":"cascata"')
    // Espera o rascunho assentar antes de comparar.
    await page.waitForTimeout(2500)
    const before = await draftContent()

    await page.getByRole('button', { name: 'Ver a animação' }).click()
    const features = preview.locator('[data-puck-component="Features-a"] .anim')
    await expect(features).toHaveClass(/anim-play/)
    await expect(features).not.toHaveClass(/anim-play/, { timeout: 6000 })
    await page.waitForTimeout(1500)
    expect(await draftContent()).toEqual(before)

    const dialog = page.getByRole('dialog')
    await expect(async () => {
      await page.getByRole('button', { name: 'Publicar', exact: true }).click()
      await expect(dialog).toBeVisible({ timeout: 1000 })
    }).toPass()
    await dialog
      .getByRole('button', { name: /^Publicar/ })
      .last()
      .click()
    await expect(dialog).toContainText('Pronto, a página está no ar')

    const { context, visitor } = await visit(browser)
    await expect(visitor.locator('.section', { has: visitor.locator('.features') })).toHaveClass(
      /anim anim--cascata/,
    )
    // As outras continuam "Igual ao site", que agora é Nenhuma.
    await expect(visitor.locator('.hero')).not.toHaveClass(/anim/)
    await context.close()
  })

  test('galeria: abre em tela cheia, anda com o teclado e devolve o foco ao fechar', async ({
    browser,
  }) => {
    const { context, visitor } = await visit(browser)
    const first = visitor.getByRole('button', { name: /Ver foto 1 de 2 em tela cheia/ })
    await first.click()
    const viewer = visitor.getByRole('dialog', { name: 'Fotos da galeria' })
    await expect(viewer).toBeVisible()
    await expect(viewer).toContainText('1 de 2')
    await expect(viewer).toContainText('Foto a')
    await expect(visitor.getByRole('button', { name: 'Fechar' })).toBeFocused()
    await visitor.keyboard.press('ArrowRight')
    await expect(viewer).toContainText('2 de 2')
    await expect(viewer).toContainText('Foto b')
    await visitor.keyboard.press('ArrowRight')
    await expect(viewer).toContainText('1 de 2')
    await visitor.keyboard.press('ArrowLeft')
    await expect(viewer).toContainText('2 de 2')
    // O foco não sai da janela.
    for (let i = 0; i < 4; i++) await visitor.keyboard.press('Tab')
    expect(await viewer.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true)
    await visitor.keyboard.press('Escape')
    await expect(viewer).toBeHidden()
    await expect(first).toBeFocused()
    await context.close()
  })

  test('botão do WhatsApp só no celular, e sai da frente na chamada final', async ({ browser }) => {
    const desktop = await visit(browser)
    await expect(desktop.visitor.locator('.wa-float')).toBeHidden()
    await desktop.context.close()

    const { context, visitor } = await visit(browser, { viewport: { width: 390, height: 800 } })
    const float = visitor.getByRole('link', { name: 'Falar no WhatsApp' })
    await expect(float).toBeVisible()
    expect(
      await float.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44)
    await visitor.locator('.cta').evaluate((element) => element.scrollIntoView({ block: 'center' }))
    await expect(visitor.locator('.wa-float')).toHaveAttribute('data-hidden', 'true')
    await expect(visitor.getByRole('link', { name: 'Falar no WhatsApp' })).toHaveCount(0)
    // Sem rolagem lateral.
    expect(
      await visitor.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await context.close()
  })
})
