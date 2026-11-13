import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Entrega 4: campos do painel mais claros (achados 11.3, 11.4, 11.5, 3.6, 4.4, 4.7, 5.4, 7.1,
// 7.4, 7.5, 2.8) e desfazer com segurança (4.3, 5.5, 9.7, 1.5, 10.5), no banco de
// TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: { collection: 'pages' | 'media'; id: number }[] = []
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
)

const hero = {
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title: 'Bolos feitos à mão com carinho',
    text: 'Encomendas pelo WhatsApp.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
}

const features = {
  type: 'Features',
  props: {
    id: 'Features-1',
    menuLabel: '',
    title: 'Diferenciais',
    marker: 'none',
    items: [
      { title: 'Entrega rápida', text: 'Texto.', icon: 'check', photo: null },
      { title: 'Feito na hora', text: 'Texto.', icon: 'check', photo: null },
    ],
    style: 'light',
    anim: 'site',
  },
}

const testimonials = {
  type: 'Testimonials',
  props: {
    id: 'Testimonials-1',
    menuLabel: '',
    title: 'Clientes',
    items: [
      { quote: 'Muito bom.', name: 'Ana', photo: null },
      { quote: 'Gostei.', name: 'Bia', photo: null },
    ],
    style: 'soft',
    anim: 'site',
  },
}

const richText = {
  type: 'RichText',
  props: {
    id: 'RichText-1',
    menuLabel: '',
    title: 'Sobre',
    body: '<p>Olá mundo.</p>',
    style: 'light',
    anim: 'site',
  },
}

async function createPage(content: unknown[]) {
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Página de teste',
      slug: `campos-${SUFFIX}-${created.length}`,
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content } },
      _status: 'draft',
    },
    draft: true,
    overrideAccess: true,
  })
  created.push({ collection: 'pages', id: doc.id })
  return doc.id
}

async function createPhoto(name: string) {
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'media',
    data: { alt: `Foto ${name}` },
    file: { data: PNG, mimetype: 'image/png', name: `${name}-${SUFFIX}.png`, size: PNG.length },
    overrideAccess: true,
  })
  created.push({ collection: 'media', id: doc.id })
  return doc.id
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
  return (doc.content as { data: { content: { type: string; props: Record<string, unknown> }[] } })
    .data.content
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

test.describe('editor: campos mais claros e desfazer com segurança', () => {
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

  test('Banner: título que cresce, destaque tocando nas palavras e foto só com fundo de foto', async ({
    page,
  }) => {
    const id = await createPage([hero])
    await openEditor(page, id, 1)
    await pick(page, 0)

    // 11.5 e 3.6: com o fundo "Igual ao site", a foto não aparece no painel.
    await expect(fields(page).getByRole('button', { name: 'Escolher foto' })).toHaveCount(0)
    await fields(page).locator('label', { hasText: 'Foto ao lado' }).first().click()
    await expect(fields(page).getByRole('button', { name: 'Escolher foto' })).toBeVisible()

    // 11.3: o título fica inteiro à vista, numa caixa que cresce.
    const title = fields(page).locator('textarea[name="title"]')
    const oneLine = (await title.boundingBox())?.height ?? 0
    await title.fill('Bolos feitos à mão com carinho e muito amor para a sua festa de aniversário')
    await expect.poll(async () => (await title.boundingBox())?.height ?? 0).toBeGreaterThan(oneLine)
    await title.press('Enter')
    await expect(title).not.toHaveValue(/\n/)

    // 11.4 e 3.4: tocar nas palavras do título, em vez de copiar.
    await page.waitForTimeout(800)
    await fields(page).getByRole('button', { name: 'à', exact: true }).click()
    await fields(page).getByRole('button', { name: 'mão', exact: true }).click()
    await expect(fields(page).getByRole('button', { name: 'mão', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect
      .poll(async () => (await savedContent(id))[0].props.highlight, { timeout: 15_000 })
      .toBe('à mão')
  })

  test('Destaques: ícone pelo desenho só com o marcador Ícone, e "+ Adicionar destaque"', async ({
    page,
  }) => {
    const id = await createPage([features])
    await openEditor(page, id, 1)
    await pick(page, 0)
    await fields(page).locator('[class*="ArrayFieldItem-summary"]').first().click()
    await expect(fields(page).getByRole('radiogroup', { name: 'Ícone' })).toHaveCount(0)
    await fields(page).locator('label', { hasText: 'Ícone' }).first().click()
    const icons = fields(page).getByRole('radiogroup', { name: 'Ícone' })
    await expect(icons).toBeVisible()
    await icons.getByRole('radio', { name: 'Coração' }).check({ force: true })
    await expect
      .poll(async () => {
        const items = (await savedContent(id))[0].props.items as { icon: string }[]
        return items[0].icon
      })
      .toBe('heart')
    await expect(fields(page).getByRole('button', { name: 'Adicionar destaque' })).toBeVisible()
  })

  test('4.3 remover um depoimento tem Desfazer', async ({ page }) => {
    const id = await createPage([testimonials])
    await openEditor(page, id, 1)
    await pick(page, 0)
    await fields(page)
      .locator('[class*="ArrayFieldItem"]', { hasText: 'Bia' })
      .locator('button[title="Remover"]')
      .first()
      .click()
    await expect(page.getByText('Depoimento removido.')).toBeVisible()
    await expect
      .poll(async () => ((await savedContent(id))[0].props.items as unknown[]).length)
      .toBe(1)
    await page.getByRole('button', { name: 'Desfazer' }).last().click()
    await expect
      .poll(async () =>
        ((await savedContent(id))[0].props.items as { name: string }[]).map((item) => item.name),
      )
      .toEqual(['Ana', 'Bia'])
  })

  test('Texto simples: botões com nome, Link com Ctrl+K e tabela colada arrumada', async ({
    page,
  }) => {
    const id = await createPage([richText])
    await openEditor(page, id, 1)
    await pick(page, 0)
    const menu = fields(page).locator('[class*="RichTextMenu"]').first()
    // 7.5: nada de "Escolher" nem alinhamento apagado.
    await expect(menu.locator('button[title="Subtítulo"]')).toBeVisible()
    await expect(menu.locator('button[title="Escolher"]')).toHaveCount(0)

    const text = fields(page).locator('[contenteditable="true"]').first()
    await text.click()
    await text.evaluate((element) => {
      const node = element.querySelector('p')?.firstChild
      if (!node) return
      const range = document.createRange()
      range.setStart(node, 0)
      range.setEnd(node, 3)
      getSelection()?.removeAllRanges()
      getSelection()?.addRange(range)
    })
    await page.waitForTimeout(300)
    // 7.1: o Link existe, e o Ctrl+K abre ele.
    await page.keyboard.press('Control+k')
    await fields(page).getByPlaceholder('Site, e-mail ou telefone').fill('contato@loja.com.br')
    await fields(page).getByRole('button', { name: 'Pôr o link' }).click()
    await expect
      .poll(async () => (await savedContent(id))[0].props.body, { timeout: 15_000 })
      .toContain('<a href="mailto:contato@loja.com.br"')

    // 7.4: a tabela colada não junta as células.
    await text.click()
    await page.keyboard.press('Control+End')
    await text.evaluate((element) => {
      const data = new DataTransfer()
      data.setData('text/html', '<table><tr><td>Bolo</td><td>R$ 45</td></tr></table>')
      data.setData('text/plain', 'Bolo R$ 45')
      element.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
      )
    })
    await expect
      .poll(async () => (await savedContent(id))[0].props.body, { timeout: 15_000 })
      .toContain('Bolo · R$ 45')
  })

  test('Galeria: foto para qualquer posição, Tirar com Desfazer e trocar tocando na prévia', async ({
    page,
  }) => {
    const photos = [await createPhoto('a'), await createPhoto('b'), await createPhoto('c')]
    const id = await createPage([
      {
        type: 'Gallery',
        props: {
          id: 'Gallery-1',
          menuLabel: '',
          title: 'Galeria',
          images: photos.map((mediaId) => ({ mediaId, caption: '' })),
          layout: 'grid',
          showCaptions: false,
          style: 'light',
          anim: 'site',
        },
      },
    ])
    const order = async () =>
      ((await savedContent(id))[0].props.images as { mediaId: number }[]).map(
        (image) => image.mediaId,
      )
    await openEditor(page, id, 1)
    await pick(page, 0)

    // 5.4: a primeira foto vai direto para o fim.
    await fields(page).getByLabel('Posição').first().selectOption('2')
    await expect.poll(order).toEqual([photos[1], photos[2], photos[0]])

    // 5.5: tirar a foto tem Desfazer.
    await fields(page).getByRole('button', { name: 'Tirar a foto 1' }).click()
    await expect(page.getByText('Foto tirada da seção.')).toBeVisible()
    await expect.poll(order).toEqual([photos[2], photos[0]])
    await page.getByRole('button', { name: 'Desfazer' }).last().click()
    await expect.poll(order).toEqual([photos[1], photos[2], photos[0]])

    // Com a seção escolhida, tocar na foto da prévia abre a biblioteca.
    const image = sections(page).first().locator('[data-media-id]').first()
    await image.scrollIntoViewIfNeeded()
    await image.click({ force: true })
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('9.7 a cópia duplicada fica escolhida; 1.5 Mostrar painéis; 2.8 abas são botões', async ({
    page,
  }) => {
    const id = await createPage([hero, features])
    await openEditor(page, id, 2)
    await pick(page, 0)
    await page
      .frameLocator('iframe')
      .first()
      .getByRole('button', { name: 'Duplicar', exact: true })
      .click()
    await expect(sections(page)).toHaveCount(3)
    // As opções que aparecem são as da cópia (a seção logo abaixo da original).
    await expect(page.getByRole('heading', { name: 'Banner principal', level: 2 })).toBeVisible()
    await expect(fields(page).locator('textarea[name="title"]')).toBeVisible()

    await page.getByRole('button', { name: 'Esconder painéis' }).click()
    await page.getByRole('button', { name: 'Mostrar painéis' }).click()
    await expect(fields(page)).toBeVisible()

    const tabs = page.locator('[class*="NavItem-link"]')
    await expect(tabs.first()).toHaveAttribute('role', 'button')
    await expect(tabs.first()).toHaveAttribute('tabindex', '0')
  })

  test('10.5 Versões dizem o que mudou e pedem confirmação antes de voltar', async ({ page }) => {
    const id = await createPage([hero])
    const payload = await getPayload({ config })
    const publish = (title: string, content: unknown[]) =>
      payload.update({
        collection: 'pages',
        id,
        data: {
          title,
          content: { version: CONTENT_VERSION, data: { root: { props: {} }, content } },
          _status: 'published',
        },
        overrideAccess: true,
      })
    await publish('Página de teste', [hero])
    await publish('Página de teste', [
      { ...hero, props: { ...hero.props, title: 'Outro' } },
      features,
    ])
    await openEditor(page, id, 2)
    await page.getByRole('button', { name: 'Versões' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Entrou: Destaques. Mudou: Banner principal.')
    await expect(dialog).toContainText('Primeira versão publicada.')
    await dialog.getByRole('button', { name: 'Voltar para esta' }).click()
    await expect(dialog).toContainText('O rascunho passa a ser esta versão.')
    await dialog.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialog.getByRole('button', { name: 'Descartar o rascunho' })).toBeVisible()
  })
})
