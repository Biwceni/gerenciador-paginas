import { expect, type Page, test } from '@playwright/test'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 5a: C6 (biblioteca de fotos para
// sites maiores, com cortar e girar) e F2 (nomes dos visuais, com prévia antes de trocar). No banco
// de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const MASS = 499
let realPhoto = 0
let pageId = 0

async function db() {
  const payload = await getPayload({ config })
  return payload
}

/** Uma foto de verdade, 400 × 300, com metade esquerda vermelha (para conferir o corte). */
async function photoFile() {
  const left = await sharp({
    create: { width: 200, height: 300, channels: 3, background: '#cc2222' },
  })
    .png()
    .toBuffer()
  return sharp({ create: { width: 400, height: 300, channels: 3, background: '#2255cc' } })
    .composite([{ input: left, left: 0, top: 0 }])
    .png()
    .toBuffer()
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('load')
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

const preview = (page: Page) => page.frameLocator('.ed-root iframe').first()
const sections = (page: Page) =>
  preview(page).locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')

const noSideScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)

test.describe.serial('Etapa 5a: biblioteca de fotos e visuais', () => {
  test.beforeAll(async () => {
    test.setTimeout(180_000)
    await seedTestUser()
    const payload = await db()
    const data = await photoFile()
    const photo = await payload.create({
      collection: 'media',
      data: { alt: `Foto de verdade ${SUFFIX}` },
      file: { data, mimetype: 'image/png', name: `etapa5a-${SUFFIX}.png`, size: data.length },
      overrideAccess: true,
    })
    realPhoto = photo.id
    // 499 cópias da mesma foto (mesma miniatura, nome de arquivo próprio): a biblioteca passa de 500.
    await payload.db.drizzle.execute(sql`
      INSERT INTO media (alt, url, filename, mime_type, filesize, width, height, focal_x, focal_y,
        sizes_thumbnail_url, sizes_thumbnail_width, sizes_thumbnail_height,
        sizes_thumbnail_mime_type, sizes_thumbnail_filesize, sizes_thumbnail_filename,
        updated_at, created_at)
      SELECT 'Massa ' || ${String(SUFFIX)} || ' nº ' || g, url,
        'massa-' || ${String(SUFFIX)} || '-' || g || '.png', mime_type, filesize, width, height,
        50, 50, sizes_thumbnail_url, sizes_thumbnail_width, sizes_thumbnail_height,
        sizes_thumbnail_mime_type, sizes_thumbnail_filesize, sizes_thumbnail_filename,
        now() - (g || ' seconds')::interval, now() - (g || ' seconds')::interval
      FROM media, generate_series(1, ${MASS}) g WHERE id = ${realPhoto}`)
    const created = await payload.create({
      collection: 'pages',
      data: {
        title: 'Etapa 5a',
        slug: `etapa5a-${SUFFIX}`,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Gallery',
                props: {
                  id: 'Gallery-5a',
                  menuLabel: '',
                  title: 'Galeria',
                  images: [],
                  style: 'light',
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
  })

  test.afterAll(async () => {
    const payload = await db()
    await payload.db.drizzle.execute(
      sql`DELETE FROM media WHERE filename LIKE ${`massa-${SUFFIX}-%`}`,
    )
    await payload.delete({ collection: 'pages', id: pageId, overrideAccess: true }).catch(() => {})
    await payload
      .delete({ collection: 'media', id: realPhoto, overrideAccess: true })
      .catch(() => {})
    await payload.delete({
      collection: 'photo-folders',
      where: { name: { like: `${SUFFIX}` } },
      overrideAccess: true,
    })
    await cleanupTestUser()
  })

  test('C6 na tela Fotos: 500 fotos aos poucos, busca sem resultado, pasta vazia e mover várias', async ({
    page,
  }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await open(page, '/admin/fotos')
    const tiles = page.locator('.gp-media__item')
    // Só as primeiras 60 entram; o resto chega ao rolar até o fim.
    await expect(tiles).toHaveCount(60, { timeout: 60_000 })
    await expect(page.getByRole('button', { name: /Mostrar mais fotos/ })).toBeVisible()
    await page.getByRole('button', { name: /Mostrar mais fotos/ }).scrollIntoViewIfNeeded()
    await expect.poll(() => tiles.count()).toBeGreaterThan(60)

    // Busca de uma palavra que não está em nenhuma foto.
    const search = page.getByLabel('Procurar foto pelo nome ou pela descrição')
    await search.fill('palavra-que-nao-existe')
    await expect(page.getByText('Nenhuma foto com esse nome ou descrição.')).toBeVisible()
    await search.fill(`Massa ${SUFFIX} nº 49`)
    // nº 49 e nº 490 a 499.
    await expect(tiles).toHaveCount(11)
    await search.fill('')

    // Pasta nova: abre vazia, com a explicação.
    const folder = `Lote ${SUFFIX}`
    await page.getByRole('button', { name: 'Nova pasta' }).click()
    await page.getByLabel('Nome da pasta').fill(folder)
    await page.getByRole('button', { name: 'Criar a pasta' }).click()
    await expect(page.getByText(/Esta pasta está vazia/)).toBeVisible({ timeout: 20_000 })
    // O mesmo nome de novo é recusado, sem ligar para maiúscula.
    await page.getByRole('button', { name: 'Nova pasta' }).click()
    await page.getByLabel('Nome da pasta').fill(folder.toLowerCase())
    await page.getByRole('button', { name: 'Criar a pasta' }).click()
    await expect(page.locator('#pf-error')).toContainText('Já existe uma pasta')
    await page.getByRole('button', { name: 'Cancelar' }).click()

    // Escolher 3 fotos em "Todas" e mudar de pasta.
    await page.locator('.gp-folders__chip', { hasText: 'Todas' }).click()
    await search.fill(`Massa ${SUFFIX} nº 1`)
    await page.getByRole('button', { name: 'Escolher várias', exact: true }).click()
    await tiles.nth(0).click()
    await tiles.nth(1).click()
    await tiles.nth(2).click()
    await expect(page.getByText('3 fotos escolhidas')).toBeVisible()
    await page.locator('.gp-selectbar select').selectOption({ label: folder })
    await page.getByRole('button', { name: 'Mover', exact: true }).click()
    await expect(page.getByText(`3 fotos foram para a pasta “${folder}”.`)).toBeVisible({
      timeout: 20_000,
    })
    // A contagem muda na hora, sem esperar a tela ser relida.
    await expect(
      page.locator('.gp-folders__chip', { hasText: folder }).locator('.gp-folders__count'),
    ).toHaveText('3')

    // Apagar a pasta não apaga as fotos: elas voltam para "Sem pasta".
    await search.fill('')
    await page.locator('.gp-folders__chip', { hasText: folder }).click()
    await page.getByRole('button', { name: 'Apagar a pasta' }).first().click()
    await expect(page.getByText(/não são apagadas/)).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Apagar a pasta' }).click()
    await expect(page.getByText(/continuam na biblioteca, em “Sem pasta”/)).toBeVisible({
      timeout: 20_000,
    })
    const payload = await db()
    const { totalDocs } = await payload.count({
      collection: 'media',
      where: { filename: { like: `massa-${SUFFIX}-` } },
      overrideAccess: true,
    })
    expect(totalDocs).toBe(MASS)

    // No celular, a fila de pastas e a barra não fazem a página rolar para o lado.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Escolher várias', exact: true }).click()
    await tiles.nth(0).click()
    expect(await noSideScroll(page)).toBe(true)
  })

  test('C6 extra: girar e cortar quadrada troca o arquivo da mesma foto', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await open(page, '/admin/fotos')
    await page
      .getByLabel('Procurar foto pelo nome ou pela descrição')
      .fill(`Foto de verdade ${SUFFIX}`)
    await page.locator('.gp-media__item').first().click()
    await page.getByRole('button', { name: 'Cortar ou girar' }).click()
    const dialog = page.getByRole('dialog', { name: /Cortar ou girar/ })
    await expect(dialog.locator('.gp-photoedit__crop')).toBeVisible({ timeout: 20_000 })
    await dialog.getByRole('button', { name: 'Girar para a direita' }).click()
    await dialog.getByRole('button', { name: 'Quadrada' }).click()
    await expect(dialog.getByLabel(/Área do recorte: 300 × 300 px/)).toBeVisible()
    // Teclado: Shift + seta para cima diminui o recorte.
    await dialog.locator('.gp-photoedit__crop').focus()
    await page.keyboard.press('Shift+ArrowUp')
    await expect(dialog.getByLabel(/Área do recorte: 296 × 296 px/)).toBeVisible()
    await page.keyboard.press('Shift+ArrowDown')
    await dialog.getByRole('button', { name: 'Salvar a foto' }).click()
    await expect(page.getByText(/Foto salva\. Ela já mudou/)).toBeVisible({ timeout: 30_000 })
    const payload = await db()
    const photo = await payload.findByID({
      collection: 'media',
      id: realPhoto,
      overrideAccess: true,
    })
    expect([photo.width, photo.height]).toEqual([300, 300])
    expect(photo.filename).toMatch(/-editada/)
    expect([photo.focalX, photo.focalY]).toEqual([50, 50])
  })

  test('C6 no editor: várias fotos de uma vez, na ordem dos toques', async ({ page }) => {
    test.setTimeout(240_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    // Estresse: muitas pastas de nome comprido não empurram o diálogo para fora da tela.
    const payload = await db()
    for (let i = 0; i < 12; i++) {
      await payload.create({
        collection: 'photo-folders',
        data: { name: `Pastacomnomebemcomprido${i}-${SUFFIX}`.slice(0, 40) },
        overrideAccess: true,
      })
    }
    await signIn(page)
    await page.goto(`${BASE}/admin/editor/${pageId}`)
    await expect(sections(page)).toHaveCount(1, { timeout: 180_000 })
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' })
    await page.waitForTimeout(1500)
    await sections(page)
      .first()
      .click({ position: { x: 6, y: 6 } })
    await page.getByRole('button', { name: '+ Adicionar fotos' }).click()
    const dialog = page.getByRole('dialog', { name: 'Escolha as fotos' })
    await expect(dialog.locator('.ed-media-item')).toHaveCount(60, { timeout: 30_000 })
    const box = await dialog.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(1440)
    await dialog.getByLabel('Procurar foto').fill(`Massa ${SUFFIX} nº 7`)
    const items = dialog.locator('.ed-media-item')
    // nº 7 e nº 70 a 79 e 700…: só as de até 499 existem (nº 7, 70–79).
    await expect(items).toHaveCount(11)
    await items.nth(2).click()
    await items.nth(0).click()
    await expect(items.nth(0)).toHaveAccessibleName(/foto 2 de 2/)
    await expect(dialog.getByRole('button', { name: 'Adicionar 2 fotos' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Adicionar 2 fotos' }).click()
    const list = page.locator('.ed-photo-list__label:visible')
    await expect(list).toHaveCount(2)
    const names = await list.allInnerTexts()
    expect(names[0]).toMatch(/^1\. Massa .* nº 7\d$/)
    expect(names[1]).toMatch(/^2\. Massa .* nº 7$/)
  })

  test('F2: o toque no visual abre a prévia; Voltar não troca', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await signIn(page)
    await open(page, '/admin/sua-marca')
    const names = page.locator('.gp-personality__option b')
    await expect(names).toHaveText(['Simples', 'Sóbrio', 'Impacto', 'Acolhedor', 'Revista'])
    const current = page.locator('.gp-personality__option[aria-pressed="true"]')
    const before = await current.locator('b').innerText()
    const other = page.locator('.gp-personality__option[aria-pressed="false"]').first()
    const otherName = await other.locator('b').innerText()
    await other.click()
    const dialog = page.getByRole('dialog', { name: `Visual ${otherName}` })
    await expect(dialog).toBeVisible()
    const frame = dialog.frameLocator('iframe')
    await expect(frame.locator('body')).toHaveAttribute('data-personality', /.+/, {
      timeout: 20_000,
    })
    await dialog.getByRole('button', { name: 'Celular' }).click()
    await dialog.getByRole('button', { name: 'Voltar' }).click()
    await expect(dialog).toBeHidden()
    await expect(current.locator('b')).toHaveText(before)
    await expect(other).toBeFocused()
  })
})
