import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 4a: C5 (Tabela, Equipe, Faixa de
// logos, Antes e depois) e B5 (Agenda). No banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: { collection: 'pages' | 'media'; id: number }[] = []
let count = 0

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(content: unknown[], status: 'draft' | 'published' = 'draft') {
  const payload = await getPayload({ config })
  const slug = `etapa4a-${SUFFIX}-${++count}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title: `Etapa 4a ${count}`, slug, content: wrap(content), _status: status },
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

const day = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(Date.now() + offset * 86_400_000),
  )

const base = { menuLabel: '', style: 'light', anim: 'site' }

const tabela = {
  type: 'Table',
  props: {
    ...base,
    id: 'Table-4a',
    title: 'Tabela larga',
    text: '',
    head: Array.from({ length: 8 }, (_, c) => `Coluna ${c + 1}`),
    rows: Array.from({ length: 30 }, (_, r) =>
      Array.from({ length: 8 }, (_, c) => (c === 0 ? `Linha ${r + 1}` : `Valor ${r}-${c}`)),
    ),
  },
}

const comparacao = (photo: number, other: number, layout?: string) => ({
  type: 'BeforeAfter',
  props: {
    ...base,
    id: `BeforeAfter-${layout ?? 'auto'}`,
    title: 'Antes e depois',
    text: '',
    ...(layout ? { layout } : {}),
    items: [{ before: { mediaId: photo }, after: { mediaId: other }, caption: 'Fachada' }],
  },
})

const agenda = (extra: Record<string, unknown>, items: Record<string, unknown>[]) => ({
  type: 'Events',
  props: {
    ...base,
    id: `Events-${count}-${items.length}`,
    title: 'Agenda',
    text: '',
    ...extra,
    items,
  },
})

const data = (date: string, title: string, extra: Record<string, unknown> = {}) => ({
  date,
  time: '',
  title,
  place: '',
  text: '',
  button: null,
  ...extra,
})

test.describe.serial('Etapa 4a: seções novas', () => {
  let photo = 0
  let other = 0

  test.beforeAll(async () => {
    await seedTestUser()
    photo = await createPhoto('antes', 1200, 900, '#c9a27a')
    other = await createPhoto('depois', 1200, 900, '#4f7a5a')
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

  test('C5: no celular a tabela rola para o lado com a primeira coluna parada', async ({
    page,
  }) => {
    const { slug } = await createPage([tabela], 'published')
    await page.setViewportSize({ width: 390, height: 844 })
    await openSite(page, slug)
    const box = page.getByRole('region', { name: 'Tabela larga' })
    await box.scrollIntoViewIfNeeded()
    const first = box.getByRole('rowheader', { name: 'Linha 1', exact: true })
    const before = await first.boundingBox()
    // A página não rola para o lado; só a caixa da tabela.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    await box.evaluate((el) => el.scrollBy({ left: 400 }))
    await page.waitForTimeout(300)
    expect(await box.evaluate((el) => el.scrollLeft)).toBeGreaterThan(300)
    expect((await first.boundingBox())?.x).toBeCloseTo(before!.x, 0)
  })

  test('C5: antes e depois lado a lado no computador e de arrastar (com as setas) no celular', async ({
    page,
  }) => {
    const { slug } = await createPage([comparacao(photo, other)], 'published')
    await openSite(page, slug)
    const range = page.getByRole('slider', { name: 'Comparar antes e depois: Fachada' })
    await expect(range).toBeHidden()
    await page.setViewportSize({ width: 390, height: 844 })
    await expect(range).toBeVisible()
    await range.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await expect(range).toHaveAttribute('aria-valuetext', '40% da foto de antes')
    await page.keyboard.press('End')
    await expect(range).toHaveValue('100')
    const clip = await page
      .locator('.ba__side--before')
      .evaluate((el) => getComputedStyle(el).clipPath)
    expect(clip).toContain('inset(0px')
  })

  test('B5: próximos primeiro, passados em "Já aconteceu", contagem e arquivo da agenda', async ({
    page,
    request,
  }) => {
    const items = [
      data(day(20), 'Daqui a 20 dias'),
      data(day(-3), 'Já foi'),
      data(day(2), 'Daqui a 2 dias', { time: '20:00', place: 'Teatro' }),
    ]
    const { slug } = await createPage(
      [
        agenda({ past: 'list', countdown: true }, items),
        agenda({}, [data(day(-10), 'Passado escondido')]),
      ],
      'published',
    )
    await openSite(page, slug)
    const first = page.locator('.events').first().locator('> li')
    await expect(first).toHaveCount(2)
    await expect(first.nth(0)).toContainText('Daqui a 2 dias')
    await expect(page.locator('.events__countdown')).toContainText(/Falta(m)? (1|2) dia/)
    const past = page.locator('.events__past')
    await expect(past).not.toHaveAttribute('open', '')
    await past.locator('summary').click()
    await expect(past).toContainText('Já foi')
    // A segunda agenda só tinha uma data passada, que sai sozinha.
    await expect(page.getByText('Passado escondido')).toHaveCount(0)
    await expect(page.getByText('Nenhuma data marcada agora. Volte em breve.')).toBeVisible()

    const link = page.getByRole('link', { name: 'Adicionar à agenda: Daqui a 2 dias' })
    const href = await link.getAttribute('href')
    const file = await request.get(`${BASE}${href}`)
    expect(file.headers()['content-type']).toContain('text/calendar')
    const text = await file.text()
    expect(text).toContain('SUMMARY:Daqui a 2 dias')
    expect(text).toContain('LOCATION:Teatro')
  })

  test('C5: colar uma tabela da planilha no editor troca a tabela e salva', async ({ page }) => {
    const { id } = await createPage([tabela])
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    await fields(page)
      .locator('.ed-table__paste textarea')
      .evaluate((el) => {
        const clip = new DataTransfer()
        clip.setData('text/plain', 'Serviço\tPreço\nCorte\tR$ 50\nBarba\tR$ 35\n')
        el.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData: clip, bubbles: true, cancelable: true }),
        )
      })
    await expect(fields(page).locator('.ed-table [role=status]')).toContainText(
      'Tabela colada: 2 colunas e 2 linhas',
    )
    await expect(preview(page).getByRole('rowheader', { name: 'Barba' })).toBeVisible()
    await expect
      .poll(async () => (await savedContent(id))[0].props.head, { timeout: 20_000 })
      .toEqual(['Serviço', 'Preço'])
    expect((await savedContent(id))[0].props.rows).toEqual([
      ['Corte', 'R$ 50'],
      ['Barba', 'R$ 35'],
    ])
  })
})
