import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Entrega 3: publicar com confiança (achados 2.3, 10.3, 10.4, 1.6, 1.10) e mensagens que ajudam
// (9.2, 3.7, 3.5, 7.2, 4.5), no banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: { collection: 'pages' | 'forms'; id: number }[] = []

const hero = {
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title: 'Escreva aqui um título chamativo',
    text: 'Bolos caseiros sob encomenda.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
}

const links = {
  type: 'LinkList',
  props: {
    id: 'LinkList-1',
    anim: 'site',
    title: 'Bolos da Ana',
    text: 'Encomendas pelo WhatsApp.',
    items: [
      { label: 'Falar no WhatsApp', link: { kind: 'whatsapp' } },
      { label: 'Novo link', link: null },
    ],
    style: 'soft',
  },
}

const features = {
  type: 'Features',
  props: {
    id: 'Features-1',
    menuLabel: '',
    title: 'Diferenciais',
    marker: 'none',
    items: [1, 2, 3, 4, 5, 6].map((n) => ({
      title: `Item ${n}`,
      text: 'Texto do item.',
      icon: 'check',
      photo: null,
    })),
    style: 'light',
    anim: 'site',
  },
}

async function createPage(content: unknown[], slug = `publicar-${SUFFIX}-${created.length}`) {
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Página de teste',
      slug,
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content } },
      _status: 'draft',
    },
    draft: true,
    overrideAccess: true,
  })
  created.push({ collection: 'pages', id: doc.id })
  return { id: doc.id, slug }
}

async function savedContent(id: number) {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: 'pages',
    id,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  return (doc.content as { data: { content: { props: Record<string, unknown> }[] } }).data.content
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

const sections = (page: Page) =>
  page
    .frameLocator('iframe')
    .first()
    .locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')
const fields = (page: Page) => page.locator('form[class*="_PuckFields_"]:visible')

async function openEditor(page: Page, id: number, count: number) {
  await page.goto(`${BASE}/admin/editor/${id}`)
  await expect(sections(page)).toHaveCount(count, { timeout: 180_000 })
  await page.waitForTimeout(1500)
}

async function pick(page: Page, index: number) {
  const target = sections(page).nth(index)
  await target.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await target.click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(800)
}

async function openPublish(page: Page) {
  const dialog = page.getByRole('dialog')
  await expect(async () => {
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(dialog).toBeVisible({ timeout: 1000 })
  }).toPass()
  return dialog
}

test.describe('editor: publicar com confiança e mensagens que ajudam', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
  })

  test.afterEach(async () => {
    const payload = await getPayload({ config })
    for (const { collection, id } of created.splice(0).reverse()) {
      await payload
        .delete({ collection, id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('2.3 e 10.4 Publicar lista o texto do catálogo e o botão sem destino, com "Ir até"', async ({
    page,
  }) => {
    const { id } = await createPage([hero, links])
    await openEditor(page, id, 2)
    const dialog = await openPublish(page)
    const example = dialog.locator('.ed-check', { hasText: 'texto de exemplo' })
    await expect(example).toContainText('Banner principal')
    const linkless = dialog.locator('.ed-check', { hasText: 'Um botão está sem destino' })
    await expect(linkless).toContainText('“Novo link”, em Lista de links')
    await expect(dialog.getByText('Todos os botões levam para páginas no ar')).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Publicar mesmo assim' })).toBeVisible()

    await linkless.getByRole('button', { name: 'Ir até' }).click()
    await expect(dialog).toBeHidden()
    await expect(fields(page)).toContainText('Links')
  })

  test('1.6 Publicar avisa que a personalidade escolhida ainda não está no ar', async ({
    page,
  }) => {
    const { id } = await createPage([hero])
    await openEditor(page, id, 1)
    const select = page.getByLabel('Personalidade')
    const before = await select.inputValue()
    const other = await select.locator('option').evaluateAll((options, current) => {
      const values = options.map((option) => (option as HTMLOptionElement).value)
      return values.find((value) => value !== current) ?? current
    }, before)
    await select.selectOption(other)
    await page.waitForTimeout(2500)
    const dialog = await openPublish(page)
    await expect(dialog.getByText(/A personalidade .* ainda não está no ar/)).toBeVisible()
    await expect(dialog.getByRole('link', { name: 'Publique em Sua marca' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Agora não' }).click()
    await select.selectOption(before)
    await page.waitForTimeout(2500)
  })

  test('9.2 endereço de outra página é avisado na hora, com um endereço livre', async ({
    page,
  }) => {
    const taken = await createPage([hero], `contato-${SUFFIX}`)
    const { id } = await createPage([hero])
    await openEditor(page, id, 1)
    await page.getByRole('button', { name: 'Página e Google' }).first().click()
    const dialog = page.getByRole('dialog')
    const address = dialog.locator('.ed-prefix input')
    await address.fill(taken.slug)
    await expect(dialog).toContainText(`O endereço /${taken.slug} já é da página “Página de teste”`)
    await expect(address).toHaveAttribute('aria-invalid', 'true')
    await dialog.getByRole('button', { name: `Usar /${taken.slug}-2` }).click()
    await expect(address).toHaveValue(`${taken.slug}-2`)
  })

  test('3.7 "Leva para" aceita e-mail; 3.5 páginas com o mesmo nome aparecem com o endereço', async ({
    page,
  }) => {
    const { id, slug } = await createPage([links])
    const twin = await createPage([hero])
    await openEditor(page, id, 1)
    await pick(page, 0)
    await fields(page)
      .locator('[class*="ArrayFieldItem-summary"]', { hasText: 'Novo link' })
      .click()
    await page.waitForTimeout(500)
    const lastLink = fields(page).locator('.ed-link-field select').last()
    await expect(lastLink.locator('option', { hasText: `(/${slug})` })).toHaveCount(1)
    await expect(lastLink.locator('option', { hasText: `(/${twin.slug})` })).toHaveCount(1)
    await lastLink.selectOption('url')
    const address = fields(page).getByPlaceholder('Site, e-mail ou telefone')
    await address.fill('contato@bolosdaana.com.br')
    await expect(fields(page)).toContainText('Abre um e-mail para contato@bolosdaana.com.br.')
    await expect
      .poll(
        async () => {
          const items = (await savedContent(id))[0].props.items as { link: unknown }[]
          return items[1].link
        },
        { timeout: 15_000 },
      )
      .toEqual({ kind: 'url', url: 'mailto:contato@bolosdaana.com.br' })
  })

  test('4.5 lista no máximo diz que chegou ao limite', async ({ page }) => {
    const { id } = await createPage([features])
    await openEditor(page, id, 1)
    await pick(page, 0)
    await expect(fields(page)).toContainText('6 de 6: é o máximo desta lista.')
  })

  test('7.2 com o formulário padrão já criado, o botão usa ele em vez de criar outro', async ({
    page,
  }) => {
    const payload = await getPayload({ config })
    const form = await payload.create({
      collection: 'forms',
      data: {
        title: 'Fale com a gente',
        submitButtonLabel: 'Enviar',
        confirmationType: 'message',
        fields: [{ blockType: 'text', name: 'nome', label: 'Nome', required: true, width: 100 }],
      } as never,
      overrideAccess: true,
    })
    created.push({ collection: 'forms', id: form.id })
    const { id } = await createPage([
      {
        type: 'Form',
        props: {
          id: 'Form-1',
          anim: 'site',
          menuLabel: '',
          title: 'Fale com a gente',
          text: '',
          form: null,
          successMessage: 'Recebemos.',
          style: 'soft',
        },
      },
    ])
    await openEditor(page, id, 1)
    await pick(page, 0)
    await expect(fields(page).getByRole('button', { name: /Criar formulário padrão/ })).toHaveCount(
      0,
    )
    await fields(page).getByRole('button', { name: 'Usar o formulário “Fale com a gente”' }).click()
    await expect
      .poll(async () => (await savedContent(id))[0].props.form, { timeout: 15_000 })
      .toEqual({ formId: form.id })
  })
})
