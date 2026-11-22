import { expect, type Page, test } from '@playwright/test'
import { stat } from 'fs/promises'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 4b: D1 (unidades) e D2 (dia,
// horário, unidade e arquivo no formulário). No banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: { collection: 'pages' | 'forms' | 'form-submissions'; id: number }[] = []
let savedContact: Record<string, unknown> | null = null

const week = [
  null,
  ...[1, 2, 3, 4, 5].map(() => ({ open: '08:00', close: '18:00' })),
  { open: '08:00', close: '12:00' },
]
const day = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(Date.now() + offset * 86_400_000),
  )

const unit = (index: number) => ({
  name: `Unidade ${index + 1}`,
  address: `Rua ${index + 1}, 100, Centro`,
  phone: `31333300${String(index).padStart(2, '0')}`,
  whatsapp: `319888800${String(index).padStart(2, '0')}`,
  schedule: week,
  specials: index === 0 ? [{ date: day(2), label: 'Feriado da cidade', closed: true }] : [],
})

async function setUnits(units: Record<string, unknown>[]) {
  const payload = await getPayload({ config })
  const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
  savedContact ??= site.contact as Record<string, unknown>
  await payload.updateGlobal({
    slug: 'site',
    data: { contact: { ...site.contact, units }, _status: 'published' } as never,
    overrideAccess: true,
  })
}

async function createPage(content: unknown[]) {
  const payload = await getPayload({ config })
  const slug = `etapa4b-${SUFFIX}-${created.length}`
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Etapa 4b',
      slug,
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content } },
      _status: 'published',
    },
    overrideAccess: true,
  })
  created.push({ collection: 'pages', id: doc.id })
  return slug
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

async function openSite(page: Page, slug: string) {
  await page.goto(`${BASE}/${slug}`)
  await page.waitForLoadState('load')
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

const base = { menuLabel: '', style: 'light', anim: 'site' }
const unitsSection = {
  type: 'Units',
  props: { ...base, id: 'Units-4b', title: 'Nossas unidades', text: '', map: true },
}

test.describe('Etapa 4b: unidades e formulário', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    for (const item of created.reverse()) {
      await payload
        .delete({ collection: item.collection, id: item.id, overrideAccess: true })
        .catch(() => {})
    }
    if (savedContact) {
      await payload.updateGlobal({
        slug: 'site',
        data: { contact: savedContact, _status: 'published' } as never,
        overrideAccess: true,
      })
    }
    await cleanupTestUser()
  })

  test('D1: Configurações ganha a unidade na janela, com o atalho do horário e feriado', async ({
    page,
  }) => {
    await setUnits([unit(0)])
    await signIn(page)
    await page.goto(`${BASE}/admin/configuracoes`)
    await expect(page.getByRole('button', { name: 'Adicionar unidade' })).toBeVisible({
      timeout: 120_000,
    })
    const dialog = page.getByRole('dialog', { name: 'Nova unidade' })
    // A tela pode ainda estar ligando os botões logo depois de abrir.
    await expect(async () => {
      await page.getByRole('button', { name: 'Adicionar unidade' }).click()
      await expect(dialog).toBeVisible({ timeout: 2000 })
    }).toPass({ timeout: 60_000 })
    await dialog.getByLabel('Nome da unidade').fill('Savassi')
    await dialog.getByLabel('WhatsApp').fill('31977776666')
    await dialog.getByLabel('WhatsApp').blur()
    // Telefone formatado sozinho.
    await expect(dialog.getByLabel('WhatsApp')).toHaveValue('(31) 97777-6666')
    // "Seg a sex igual" ligado: uma linha só para os 5 dias. Desligado: cinco linhas.
    await expect(dialog.getByLabel('Seg a sex: abre às')).toBeVisible()
    await dialog.getByText('Seg a sex igual').click()
    await expect(dialog.getByLabel('Segunda: abre às')).toBeVisible()
    await dialog.getByText('Seg a sex igual').click()
    // "Sáb diferente" desligado: o sábado segue a linha de seg a sex.
    await dialog.getByText('Sáb diferente').click()
    await expect(dialog.getByLabel('Seg a sáb: abre às')).toBeVisible()
    await expect(dialog.getByText('No site: Seg a sáb, 8h às 18h.')).toBeVisible()
    await dialog.getByRole('button', { name: 'Fechar nos feriados nacionais' }).click()
    await expect(dialog.locator('.gp-specials__item').first()).toBeVisible()
    await dialog.getByRole('button', { name: 'Adicionar unidade' }).click()
    await expect(dialog).toBeHidden()
    await expect(page.locator('.gp-unit')).toHaveCount(2)
    await expect(page.locator('.gp-unit').nth(1)).toContainText('Savassi')
    // Publica e confere no banco.
    await page.getByRole('button', { name: 'Publicar configurações' }).click()
    await expect(page.getByText('Configurações publicadas em todo o site.')).toBeVisible({
      timeout: 30_000,
    })
    const payload = await getPayload({ config })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    const units = site.contact?.units ?? []
    expect(units).toHaveLength(2)
    expect(units[1].whatsapp).toBe('(31) 97777-6666')
    expect((units[1].schedule as unknown[])[6]).toEqual({ open: '08:00', close: '18:00' })
    expect((units[1].specials as unknown[]).length).toBeGreaterThan(5)
    // Os campos de sempre seguem a primeira unidade.
    expect(site.contact?.whatsapp).toBe('(31) 98888-0000')
    expect(site.contact?.hours).toBe('Seg a sex, 8h às 18h · Sáb, 8h às 12h')
  })

  test('D1: 1 e 12 unidades na seção, e o WhatsApp do canto deixa escolher', async ({
    browser,
  }) => {
    await setUnits([unit(0)])
    const slug = await createPage([unitsSection])
    const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    await openSite(desktop, slug)
    await expect(desktop.locator('.unit')).toHaveCount(1)
    await expect(desktop.locator('.units--one')).toBeVisible()
    await expect(desktop.getByText('Feriado da cidade')).toBeVisible()
    await expect(desktop.locator('.unit__hours')).toContainText('Seg a sex')
    // Mapa só depois do toque: nenhum iframe do Google ao abrir.
    expect(await desktop.locator('iframe').count()).toBe(0)

    await setUnits(Array.from({ length: 12 }, (_, index) => unit(index)))
    await openSite(desktop, slug)
    await expect(desktop.locator('.unit')).toHaveCount(12)
    expect(await desktop.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    await desktop.close()

    const phone = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    await openSite(phone, slug)
    expect(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    const float = phone.getByRole('button', { name: 'Falar no WhatsApp: escolher a unidade' })
    await float.click()
    const choose = phone.getByRole('dialog', { name: 'Falar com qual unidade?' })
    await expect(choose.getByRole('link')).toHaveCount(12)
    await expect(choose.getByRole('link', { name: 'Unidade 3' })).toHaveAttribute(
      'href',
      /wa\.me\/5531988880002/,
    )
    await phone.keyboard.press('Escape')
    await expect(choose).toBeHidden()
    await phone.close()
  })

  test('D2: dia, horário, unidade e arquivo; arquivo errado recusado e só abre logado', async ({
    browser,
  }) => {
    await setUnits([unit(0), unit(1)])
    const payload = await getPayload({ config })
    const form = await payload.create({
      collection: 'forms',
      data: {
        title: `Agenda ${SUFFIX}`,
        submitButtonLabel: 'Agendar',
        confirmationType: 'message',
        fields: [
          { blockType: 'text', name: 'nome', label: 'Nome', required: true, width: 100 },
          { blockType: 'unit', name: 'unidade', label: 'Unidade', required: true, width: 100 },
          {
            blockType: 'date',
            name: 'dia',
            label: 'Dia',
            required: true,
            width: 100,
            days: 14,
            weekdays: '0,1,2,3,4,5,6',
          },
          {
            blockType: 'time',
            name: 'hora',
            label: 'Horário',
            required: true,
            width: 100,
            from: '00:00',
            to: '23:30',
            step: 30,
          },
          {
            blockType: 'file',
            name: 'foto',
            label: 'Foto',
            required: true,
            width: 100,
            accept: 'photo',
          },
        ],
      } as never,
      overrideAccess: true,
    })
    created.push({ collection: 'forms', id: form.id })
    const slug = await createPage([
      {
        type: 'Form',
        props: {
          ...base,
          id: 'Form-4b',
          title: 'Agende',
          text: '',
          form: { formId: form.id },
          successMessage: '',
        },
      },
    ])

    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    })
    await openSite(page, slug)
    await page.getByLabel('Nome').fill('Ana')
    await page.locator('.site-form__choice', { hasText: 'Unidade 2' }).click()
    // Hoje: os horários que já passaram somem.
    await page.locator('.site-form__choice--day').first().click()
    const clock = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date())
    const shown = await page
      .locator('input[name="hora"]')
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))
    expect(shown.every((slot) => slot > clock)).toBe(true)
    // Amanhã: todos os 47 (o último começa antes das 23h30).
    await page.locator('.site-form__choice--day').nth(1).click()
    await expect(page.locator('input[name="hora"]')).toHaveCount(47)
    // Botões de 44 px.
    const box = await page.locator('.site-form__choice--day span').first().boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.locator('.site-form__choice', { hasText: '10h30' }).click()
    // No celular, "Tirar foto".
    await expect(page.getByRole('button', { name: 'Tirar foto' })).toBeVisible()

    const input = page.locator('.site-form__file input[type="file"]').first()
    // 0 byte, tipo errado e mais de 10 MB: recusados no navegador.
    await input.setInputFiles({
      name: 'vazio.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(0),
    })
    await expect(page.locator('.site-form__error')).toHaveText(
      'O arquivo está vazio. Escolha outro.',
    )
    await input.setInputFiles({
      name: 'texto.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    })
    await expect(page.locator('.site-form__error')).toContainText(
      'Esse tipo de arquivo não vale aqui',
    )
    await input.setInputFiles({
      name: 'grande.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 1),
    })
    await expect(page.locator('.site-form__error')).toContainText('O máximo é 10 MB')
    // E o servidor também recusa, sem passar pelo navegador.
    const refused = await page.request.post(`${BASE}/api/form-files/enviar`, {
      data: {
        form: form.id,
        field: 'foto',
        name: 'x.exe',
        type: 'application/x-msdownload',
        size: 10,
      },
    })
    expect(refused.status()).toBe(400)
    // 10 MB certinho: vai, com a barra de andamento.
    await input.setInputFiles({
      name: 'pedido.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.alloc(10 * 1024 * 1024, 7),
    })
    await expect(page.getByText('Enviado: pedido.jpg (10 MB)')).toBeVisible({ timeout: 60_000 })
    await page.getByText('Concordo com o uso').click()
    await page.getByRole('button', { name: 'Agendar' }).click()
    await expect(page.locator('.site-form__sent')).toBeVisible({ timeout: 30_000 })

    const { docs } = await payload.find({
      collection: 'form-submissions',
      where: { form: { equals: form.id } },
      depth: 0,
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    created.push({ collection: 'form-submissions', id: docs[0].id })
    const data = Object.fromEntries(
      (docs[0].submissionData ?? []).map((item) => [item.field, item.value]),
    )
    expect(data.unidade).toBe('Unidade 2')
    expect(data.hora).toBe('10:30')
    expect(data.dia).toMatch(/^\d{2}\/\d{2}\/\d{4} \(/)
    expect(data.foto).toBe('pedido.jpg (10 MB)')
    const fileId = (docs[0].files as number[])[0]

    // Sem login: o arquivo não abre.
    const anonymous = await browser.newContext()
    const denied = await anonymous.request.get(`${BASE}/api/form-files/${fileId}/baixar`, {
      maxRedirects: 0,
    })
    expect(denied.status()).toBe(401)
    const listed = await anonymous.request.get(`${BASE}/api/form-files`)
    expect(listed.status()).toBe(403)
    await anonymous.close()

    // Logado: o link aparece em Mensagens e baixa o arquivo.
    const panel = await browser.newPage()
    await signIn(panel)
    await panel.goto(`${BASE}/admin/mensagens?mensagem=${docs[0].id}`)
    const link = panel.getByRole('link', { name: 'pedido.jpg (10 MB)' })
    await expect(link).toBeVisible({ timeout: 120_000 })
    // O toque no link (navegação do próprio painel) baixa o arquivo inteiro.
    const [download] = await Promise.all([panel.waitForEvent('download'), link.click()])
    expect(download.suggestedFilename()).toBe('pedido.jpg')
    expect((await stat(await download.path())).size).toBe(10 * 1024 * 1024)
    await panel.close()
    await page.close()
  })
})
