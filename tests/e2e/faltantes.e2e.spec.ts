import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Entrega 6: o que faltou do teste de estresse do editor (achados 13.2, 13.6 e 13.8), no banco de
// TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: number[] = []

const hero = (button: unknown = null) => ({
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title: 'Bolos feitos à mão',
    text: 'Encomendas pelo WhatsApp.',
    image: null,
    button,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
})

const richText = (menuLabel = '') => ({
  type: 'RichText',
  props: {
    id: 'RichText-1',
    menuLabel,
    title: 'Sobre',
    body: '<p>Olá.</p>',
    style: 'light',
    anim: 'site',
  },
})

const video = {
  type: 'Video',
  props: {
    id: 'Video-v1',
    menuLabel: '',
    title: 'Nosso vídeo',
    videoId: '',
    caption: '',
    cover: null,
    style: 'light',
    anim: 'site',
  },
}

const gallery = {
  type: 'Gallery',
  props: {
    id: 'Gallery-g1',
    menuLabel: '',
    title: 'Nossas fotos',
    images: [],
    layout: 'grid',
    showCaptions: false,
    style: 'soft',
    anim: 'site',
  },
}

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(content: unknown[]) {
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Página de teste',
      slug: `faltantes-${SUFFIX}-${created.length}`,
      content: wrap(content),
      _status: 'draft',
    },
    draft: true,
    overrideAccess: true,
  })
  created.push(doc.id)
  return doc.id
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

test.describe('editor: o que faltou do teste de estresse', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    for (const id of created) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
    await cleanupTestUser()
  })

  test('13.8 "Nome no menu" só com emoji avisa na hora e pede uma palavra', async ({ page }) => {
    const id = await createPage([hero(), richText()])
    await openEditor(page, id, 2)
    await pick(page, 1)
    const input = fields(page).getByLabel('Nome no menu')
    await input.fill('⭐⭐')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(fields(page).getByRole('alert')).toContainText('pelo menos uma letra ou número')
    await expect(fields(page).getByRole('button', { name: /Colocar no menu/ })).toHaveCount(0)
    await input.fill('Novidades ⭐')
    await expect(input).not.toHaveAttribute('aria-invalid', 'true')
    await expect(fields(page)).toContainText('#novidades')
  })

  test('13.2 seções vazias: etiqueta na prévia e lista no Publicar', async ({ page }) => {
    const id = await createPage([hero(), video, gallery])
    await openEditor(page, id, 3)
    await expect(sections(page).nth(1)).toHaveAttribute(
      'data-ed-hidden',
      'falta o endereço do vídeo',
    )
    await expect(sections(page).nth(2)).toHaveAttribute('data-ed-hidden', 'não tem nenhuma foto')
    await expect(sections(page).nth(0)).not.toHaveAttribute('data-ed-hidden', /.*/)

    const dialog = await openPublish(page)
    const check = dialog.locator('.ed-check', { hasText: 'seções não vão aparecer no site' })
    await expect(check).toContainText('2 seções não vão aparecer no site')
    await expect(check).toContainText('Vídeo do YouTube: falta o endereço do vídeo')
    await expect(check).toContainText('Galeria de fotos: não tem nenhuma foto')
    await expect(dialog.getByRole('button', { name: 'Publicar mesmo assim' })).toBeVisible()
    await check.getByRole('button', { name: 'Ir até' }).first().click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Vídeo do YouTube', level: 2 })).toBeVisible()
  })

  test('13.6 botão para uma seção sem nome no menu: o "Leva para" diz isso', async ({ page }) => {
    const id = await createPage([hero(), richText()])
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'pages',
      id,
      data: {
        content: wrap([
          hero({
            label: 'Saiba mais',
            link: { kind: 'section', pageId: id, sectionId: 'RichText-1' },
          }),
          richText(),
        ]),
      },
      draft: true,
      overrideAccess: true,
    })
    await openEditor(page, id, 2)
    await pick(page, 0)
    const select = fields(page).locator('.ed-link-field select').first()
    await expect(select.locator('option:checked')).toHaveText(
      'Seção sem nome no menu (vai para o topo da página)',
    )
    await expect(fields(page)).toContainText('ficou sem “Nome no menu”')

    const dialog = await openPublish(page)
    await expect(dialog).toContainText('Um botão leva para uma seção sem nome no menu')
    await expect(dialog).toContainText('“Saiba mais”, em Banner principal')
  })
})
