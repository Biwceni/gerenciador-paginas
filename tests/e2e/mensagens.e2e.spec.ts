import { readFileSync } from 'node:fs'

import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { emptyPageContent } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Telas de Mensagens e Formulários (v2, entrega 3a), no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SLUG = `fale-${Date.now()}`
const panel = () => getPayload({ config })

async function removeAll(pageId: number | null) {
  const payload = await panel()
  await payload.delete({
    collection: 'form-submissions',
    where: { id: { exists: true } },
    overrideAccess: true,
  })
  if (pageId) {
    await payload.delete({
      collection: 'pages',
      id: pageId,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
  }
  await payload.delete({
    collection: 'forms',
    where: { id: { exists: true } },
    overrideAccess: true,
  })
}

test.describe.serial('mensagens e formulários', () => {
  let page: Page
  let pageId: number | null = null
  let formId = 0

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    await removeAll(null)
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    page = await context.newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await removeAll(pageId)
    await cleanupTestUser()
  })

  test('cria de um pronto; reescrever a pergunta não muda o nome técnico', async () => {
    await page.goto(`${BASE}/admin/formularios`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Formulários', level: 1 })).toBeVisible()
    await expect(page.getByText('Nenhum formulário ainda')).toBeVisible()
    await page.getByRole('button', { name: /Fale conosco/ }).click()
    await page.waitForURL(/\/admin\/formularios\/\d+/, { timeout: 90_000 })
    formId = Number(page.url().split('/').pop())

    const question = page.getByRole('textbox', { name: 'Pergunta' })
    await expect(question).toHaveCount(4)
    await expect(page.getByText('Todo formulário pede que a pessoa concorde')).toBeVisible()

    await question.first().fill('Como você se chama?')
    await page.getByLabel('Mensagem na tela').fill('Obrigado pelo contato!')
    await page.getByLabel('Avisar neste e-mail').fill('dono@exemplo.com')
    await expect(page.getByText('Tudo salvo')).toBeVisible({ timeout: 15_000 })

    const form = await (
      await panel()
    ).findByID({
      collection: 'forms',
      id: formId,
      depth: 0,
      overrideAccess: true,
    })
    expect(form.fields?.[0]).toMatchObject({ name: 'nome', label: 'Como você se chama?' })
    expect(form.emails?.[0]?.emailTo).toBe('dono@exemplo.com')
    expect(form.fields?.[1]).toMatchObject({ blockType: 'phone', name: 'whatsapp', width: 100 })
  })

  test('a ordem muda com as setas, e o que falta é apontado sem salvar', async () => {
    await page.reload({ waitUntil: 'networkidle' })
    const question = page.getByRole('textbox', { name: 'Pergunta' })
    await expect(question.nth(0)).toHaveValue('Como você se chama?')
    await page.getByRole('button', { name: 'Descer “Como você se chama?”' }).click()
    await expect(question.nth(1)).toHaveValue('Como você se chama?')
    await expect(page.getByText('Tudo salvo')).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Adicionar pergunta' }).click()
    await expect(page.getByText('Falta completar')).toBeVisible()
    await page.getByRole('combobox', { name: 'Tipo de resposta' }).last().selectOption('select')
    // Pela metade e parada no campo: nada é salvo, e o nome técnico não nasce daqui.
    await question.last().fill('Como nos')
    await expect(page.getByText('A pergunta é salva quando você sair do campo')).toBeVisible()
    await page.waitForTimeout(2500)
    const halfway = await (
      await panel()
    ).findByID({ collection: 'forms', id: formId, depth: 0, overrideAccess: true })
    expect(halfway.fields).toHaveLength(4)
    await question.last().fill('Como nos achou?')
    await expect(page.getByText('Escreva ao menos uma opção')).toBeVisible()
    await page.getByLabel('Opções, uma por linha').fill('Google\nAmigos')
    await expect(page.getByText('Tudo salvo')).toBeVisible({ timeout: 15_000 })

    const form = await (
      await panel()
    ).findByID({
      collection: 'forms',
      id: formId,
      depth: 0,
      overrideAccess: true,
    })
    expect(form.fields?.[4]).toMatchObject({ name: 'como_nos_achou', blockType: 'select' })
  })

  test('a mudança feita logo antes de sair da tela não se perde', async () => {
    const question = page.getByRole('textbox', { name: 'Pergunta' })
    await page.getByRole('button', { name: 'Adicionar pergunta' }).click()
    await question.last().fill('Pergunta da saída')
    await page.getByRole('link', { name: 'Formulários', exact: true }).first().click()
    await page.waitForURL(/\/admin\/formularios$/)
    await expect
      .poll(
        async () =>
          (
            await (
              await panel()
            ).findByID({ collection: 'forms', id: formId, depth: 0, overrideAccess: true })
          ).fields?.at(-1)?.name,
      )
      .toBe('pergunta_da_saida')

    // Volta ao que os próximos testes esperam.
    const payload = await panel()
    const form = await payload.findByID({
      collection: 'forms',
      id: formId,
      depth: 0,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'forms',
      id: formId,
      data: { fields: form.fields?.slice(0, -1) },
      overrideAccess: true,
    })
  })

  test('no site: telefone errado é barrado e o envio mostra a frase do formulário', async () => {
    const payload = await panel()
    const content = emptyPageContent()
    content.data.content.push({
      type: 'Form',
      props: {
        id: 'Form-1',
        menuLabel: '',
        title: 'Fale',
        text: '',
        form: { formId },
        successMessage: 'Frase antiga da seção',
        style: 'soft',
      },
    })
    const created = await payload.create({
      collection: 'pages',
      data: { title: 'Fale comigo', slug: SLUG, content, _status: 'published' },
      overrideAccess: true,
    })
    pageId = created.id

    await page.goto(`${BASE}/${SLUG}`, { waitUntil: 'networkidle' })
    await page.getByLabel('Como você se chama?').fill('Ana Souza')
    const phone = page.getByLabel('WhatsApp')
    await phone.fill('abc')
    await page.getByLabel('E-mail').fill('ana@exemplo.com')
    await page.getByLabel(/Mensagem/).fill('=1+1 tem café?')
    await page.getByLabel(/Concordo/).check()
    await page.getByRole('button', { name: 'Enviar' }).click()
    expect(await phone.evaluate((input: HTMLInputElement) => input.validationMessage)).toContain(
      'DDD',
    )
    await expect(page.getByRole('status')).toHaveCount(0)

    await phone.fill('(35) 99876-5432')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByRole('status')).toHaveText('Obrigado pelo contato!', { timeout: 15_000 })
  })

  test('o número aparece no menu e o Ler do Painel abre a mensagem', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' })
    const count = page.getByRole('navigation', { name: 'Menu do painel' }).locator('.gp-count')
    await expect(count).toHaveText(/^1/)
    await expect(page.getByRole('heading', { name: '1 mensagem nova' })).toBeVisible()
    await page.getByRole('link', { name: 'Ler a mensagem de Ana Souza' }).click()
    await page.waitForURL(/\/admin\/mensagens\?mensagem=\d+/)

    await expect(page.getByRole('heading', { name: 'Ana Souza' })).toBeVisible()
    await expect(page.getByText('Como você se chama?', { exact: true })).toBeVisible()
    await expect(page.getByText('enviada na página “Fale comigo”')).toBeVisible()
    await expect(page.getByText('Aceitou: “Concordo com o uso')).toBeVisible()
    const whatsapp = page.getByRole('link', { name: 'Responder no WhatsApp' })
    await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/5535998765432\?text=/)
    await expect(page.getByRole('link', { name: 'Responder por e-mail' })).toHaveAttribute(
      'href',
      /^mailto:ana@exemplo\.com/,
    )
    // Abrir marca como lida: o número some.
    await expect(count).toHaveCount(0, { timeout: 15_000 })
  })

  test('marcar como não lida traz o número de volta', async () => {
    await page.getByRole('button', { name: 'Marcar como não lida' }).click()
    const count = page.getByRole('navigation', { name: 'Menu do painel' }).locator('.gp-count')
    await expect(count).toHaveText(/^1/, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: /Ana Souza \(não lida\)/ })).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/mensagens$/)
  })

  test('filtros só com formulário que recebeu mensagem; a planilha respeita o filtro', async () => {
    const payload = await panel()
    await payload.create({
      collection: 'forms',
      data: {
        title: 'Sem mensagens',
        confirmationType: 'message',
        fields: [{ blockType: 'text', label: 'Nome' }],
      } as never,
      overrideAccess: true,
    })
    await page.goto(`${BASE}/admin/mensagens`, { waitUntil: 'networkidle' })
    const filters = page.getByRole('navigation', { name: 'Filtrar por formulário' })
    await expect(filters.getByRole('link')).toHaveText(['Todas (1)', 'Fale conosco (1)'])
    await filters.getByRole('link', { name: 'Fale conosco (1)' }).click()
    await page.waitForURL(/formulario=\d+/)

    const link = page.getByRole('link', { name: 'Baixar planilha' })
    await expect(link).toHaveAttribute('href', new RegExp(`formulario=${formId}`))
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()])
    expect(download.suggestedFilename()).toBe('mensagens.csv')
    const csv = readFileSync(await download.path(), 'utf8')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('"Como você se chama?"')
    expect(csv).toContain('"Ana Souza"')
    expect(csv).toContain(`"'=1+1 tem café?"`)

    // Outro filtro, pela sessão do navegador: nada desta mensagem vem junto.
    const other = await page.evaluate(() =>
      fetch('/api/form-submissions/planilha?formulario=999999').then((response) => response.text()),
    )
    expect(other).not.toContain('Ana Souza')
  })

  test('a planilha é só para quem está logado', async ({ browser }) => {
    const visitor = await browser.newContext()
    const response = await visitor.request.get(`${BASE}/api/form-submissions/planilha`)
    expect(response.status()).toBe(401)
    expect(await response.text()).not.toContain('Ana Souza')
    await visitor.close()
  })

  test('no celular, lista e mensagem são telas separadas, sem telas do Payload', async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } })
    const phone = await context.newPage()
    await login({ page: phone, user: testUser })
    await phone.goto(`${BASE}/admin/mensagens`, { waitUntil: 'networkidle' })

    const topbar = phone.locator('.gp-topbar')
    await expect(topbar.getByRole('link', { name: 'Mensagens: 1 nova' })).toBeVisible()
    await expect(phone.getByText('Colunas')).toHaveCount(0)
    await expect(phone.getByText('Filtros')).toHaveCount(0)
    await expect(phone.getByText('Criar Novo')).toHaveCount(0)

    const item = phone.getByRole('button', { name: /Ana Souza/ })
    await expect(item).toBeVisible()
    await expect(phone.getByRole('heading', { name: 'Ana Souza' })).toBeHidden()
    expect(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    )

    await item.click()
    await expect(phone.getByRole('heading', { name: 'Ana Souza' })).toBeVisible()
    await expect(item).toBeHidden()
    await expect(phone.getByRole('heading', { name: 'Mensagens', level: 1 })).toBeHidden()
    await phone.getByRole('button', { name: 'Todas as mensagens' }).click()
    await expect(item).toBeVisible()
    await context.close()
  })

  test('o formulário em uso não se exclui; a mensagem se exclui com confirmação', async () => {
    await page.goto(`${BASE}/admin/formularios/${formId}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: 'Excluir formulário' })).toBeDisabled()
    await expect(page.getByRole('link', { name: 'Fale comigo' })).toBeVisible()

    await page.goto(`${BASE}/admin/formularios`, { waitUntil: 'networkidle' })
    await expect(page.getByText(/na página Fale comigo/)).toBeVisible()
    await page.getByRole('link', { name: 'Ver respostas' }).click()
    await page.waitForURL(/formulario=\d+/)

    await page.getByRole('button', { name: /Ana Souza/ }).click()
    await page.getByRole('button', { name: 'Excluir', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Excluir esta mensagem?' })
    await dialog.getByRole('button', { name: 'Excluir' }).click()
    await expect(page.getByText('Mensagem excluída.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Ana Souza/ })).toHaveCount(0)
  })
})
