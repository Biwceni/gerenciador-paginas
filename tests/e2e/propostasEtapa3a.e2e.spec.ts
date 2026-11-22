import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 3a: C1 (banner com até 3 chamadas),
// C2 (foto inteira ou preenchida) e C4 (faixa fina). No banco de TEST_DATABASE_URL.

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
  const slug = `etapa3a-${SUFFIX}-${++count}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title: `Etapa 3a ${count}`, slug, content: wrap(content), _status: status },
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

const heroProps = (photos: number[], extra: Record<string, unknown> = {}) => ({
  id: 'Hero-3a',
  menuLabel: '',
  title: 'Primeira chamada',
  text: 'Frase da primeira.',
  image: { mediaId: photos[0] },
  button: whats('Fale com a gente'),
  button2: whats('Ver catálogo'),
  style: 'image',
  align: 'left',
  height: 'normal',
  highlight: '',
  anim: 'site',
  slides: [
    {
      title: 'Segunda chamada',
      text: 'Foto escura.',
      image: { mediaId: photos[1] },
      button: whats('Quero'),
      button2: null,
    },
    {
      title: 'Terceira chamada',
      text: 'Sem foto.',
      image: null,
      button: whats('Pedir'),
      button2: null,
    },
  ],
  autoplay: true,
  interval: '4',
  dots: true,
  transition: 'fade',
  ...extra,
})

const strip = (id: string, title: string) => ({
  type: 'CallToAction',
  props: {
    id,
    menuLabel: '',
    title,
    text: 'Frase',
    button: whats('Chamar'),
    style: 'brand',
    anim: 'site',
    layout: 'strip',
    tag: 'Novidade',
  },
})

test.describe.serial('Etapa 3a: banner, foto inteira e faixa fina', () => {
  let light = 0
  let dark = 0
  let tall = 0

  test.beforeAll(async () => {
    await seedTestUser()
    light = await createPhoto('clara', 1600, 800, '#f4e9c8')
    dark = await createPhoto('escura', 1600, 800, '#1b1530')
    tall = await createPhoto('em-pe', 400, 900, '#2b7d4f')
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

  test('C1: 3 chamadas trocam sozinhas, param com o mouse e as bolinhas escolhem pelo teclado', async ({
    page,
  }) => {
    const { slug } = await createPage(
      [{ type: 'Hero', props: heroProps([light, dark]) }],
      'published',
    )
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.mouse.move(5, 895)
    await openSite(page, slug)
    const current = page.locator('.hero__copy[data-on]')
    await expect(current).toHaveCount(1)
    await expect(current).toContainText('Primeira chamada')
    await expect(page.locator('.hero__copy[inert]')).toHaveCount(2)
    await expect(page.locator('.hero h1')).toHaveText('Primeira chamada')
    const dots = page.getByRole('group', { name: 'Chamadas do banner' }).getByRole('button')
    await expect(dots).toHaveCount(3)
    await expect(dots.first()).toHaveAttribute('aria-current', 'true')

    // Troca sozinha (4 s por chamada).
    await expect(current).toContainText('Segunda chamada', { timeout: 7_000 })
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true')

    // Mouse em cima: para.
    await page.mouse.move(700, 450)
    const held = await current.textContent()
    await page.waitForTimeout(5_000)
    expect(await current.textContent()).toBe(held)

    // Teclado: os botões da chamada à vista e depois as bolinhas; Enter escolhe e fica.
    await page.mouse.move(5, 895)
    await dots.nth(2).focus()
    await page.keyboard.press('Enter')
    await expect(current).toContainText('Terceira chamada')
    await expect(dots.nth(2)).toHaveAttribute('aria-current', 'true')
    await page.locator('body').click({ position: { x: 5, y: 895 } })
    await page.waitForTimeout(5_000)
    await expect(current).toContainText('Terceira chamada')

    // Só a chamada à vista fica fora do `inert` (as outras não recebem foco nem são lidas).
    await expect(page.locator('.hero__copy:not([inert])')).toHaveCount(1)
    await expect(page.locator('.hero__copy:not([inert])')).toContainText('Terceira chamada')

    // Celular: sem rolar para o lado, bolinhas à vista.
    await page.setViewportSize({ width: 390, height: 844 })
    await openSite(page, slug)
    await expect(dots.first()).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0)
  })

  test('C1: com "reduzir movimento", fica só a primeira chamada', async ({ browser }) => {
    const { slug } = await createPage(
      [{ type: 'Hero', props: heroProps([light, dark]) }],
      'published',
    )
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.mouse.move(5, 895)
    await openSite(page, slug)
    await page.waitForTimeout(9_000)
    await expect(page.locator('.hero__copy[data-on]')).toContainText('Primeira chamada')
    await context.close()
  })

  test('C1 no editor: mais uma chamada abre as opções de troca e o aviso na prévia', async ({
    page,
  }) => {
    const props = heroProps([light, dark], { slides: [], button2: null })
    const { id } = await createPage([{ type: 'Hero', props }])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    await expect(fields(page).getByText('Tempo de cada chamada')).toHaveCount(0)
    // Segundo botão vazio: o convite tracejado; ao abrir, o foco vai para o texto dele.
    const invites = fields(page).locator('.ed-add-optional')
    await expect(invites).toHaveCount(1)
    await invites.first().click()
    await page.keyboard.type('Ver catálogo')
    await page.keyboard.press('Tab')
    await expect
      .poll(async () => JSON.stringify((await savedContent(id))[0].props.button2), {
        timeout: 20_000,
      })
      .toContain('Ver catálogo')
    await expect(preview(page).locator('.hero__buttons .button')).toHaveCount(2)
    await fields(page).getByRole('button', { name: 'Adicionar chamada' }).click()
    await expect(fields(page).getByText('Tempo de cada chamada')).toBeVisible()
    await expect(preview(page).getByText('Este banner tem 2 chamadas')).toBeVisible()
    await expect
      .poll(
        async () => {
          const hero = (await savedContent(id))[0]
          return (hero.props.slides as unknown[]).length
        },
        { timeout: 20_000 },
      )
      .toBe(1)
  })

  test('C2 no editor: foto em pé num espaço deitado avisa; "Foto inteira" mostra o fundo', async ({
    page,
  }) => {
    const { id } = await createPage([
      {
        type: 'TextImage',
        props: {
          id: 'TextImage-3a',
          menuLabel: '',
          title: 'Foto em pé',
          text: 'Texto.',
          image: { mediaId: tall },
          side: 'right',
          style: 'light',
          anim: 'site',
          button: null,
        },
      },
    ])
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    const choice = fields(page).getByRole('radiogroup', { name: 'Como a foto ocupa o espaço' })
    await expect(choice).toBeVisible()
    await expect(fields(page).getByText(/bem mais alta que o espaço: preenchendo/)).toBeVisible()
    await choice.getByRole('radio', { name: /Foto inteira/ }).check()
    await expect(fields(page).getByText(/por isso está inteira, sem cortar/)).toBeVisible()
    await fields(page).getByRole('radio', { name: 'Cor do site' }).check()
    await expect
      .poll(async () => (await savedContent(id))[0].props.image, { timeout: 20_000 })
      .toEqual({ mediaId: tall, fit: 'contain', backdrop: 'brand' })
    await expect(preview(page).locator('img[data-fit="contain"]')).toHaveCount(1)
    // O recorte não vale para a foto inteira.
    await expect(fields(page).getByRole('button', { name: 'Ajustar o recorte' })).toHaveCount(0)
  })

  test('C4: duas faixas finas avisam no painel; a etiqueta só aparece na faixa', async ({
    page,
  }) => {
    const { id, slug } = await createPage(
      [strip('Cta-a', 'Primeira faixa'), strip('Cta-b', 'Segunda faixa')],
      'published',
    )
    await page.setViewportSize({ width: 1440, height: 900 })
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, 1)
    await expect(fields(page).getByText('Esta página já tem 2 faixas finas.')).toBeVisible()
    await expect(fields(page).getByText(/Etiqueta/)).toBeVisible()
    await expect(fields(page).getByText('Frase', { exact: true })).toHaveCount(0)
    await fields(page)
      .getByRole('radio', { name: /^Bloco/ })
      .check()
    await expect(fields(page).getByText('Esta página já tem 2 faixas finas.')).toHaveCount(0)
    await expect(fields(page).getByText(/Etiqueta/)).toHaveCount(0)

    // No site: a faixa numa linha só no computador, sem a frase; no celular, sem rolar para o lado.
    await openSite(page, slug)
    const first = page.locator('.cta--strip').first()
    await expect(first.locator('.cta__tag')).toHaveText('Novidade')
    await expect(first).not.toContainText('Frase')
    const tops = await first
      .locator('> *')
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)))
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(30)
    await page.setViewportSize({ width: 320, height: 700 })
    await openSite(page, slug)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0)
  })
})
