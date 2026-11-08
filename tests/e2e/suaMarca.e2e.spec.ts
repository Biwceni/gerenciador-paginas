import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Redesign v3, entrega 3: Sua marca (cores do logo), imagem de compartilhar e foto pequena, no banco
// de TEST_DATABASE_URL. Sem o Storage, as fotos ficam no próprio servidor (mesmo endereço).

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()

let homeId: number
let logoId: number
let photoId: number
let previous: object | null = null

/** Logo de teste: metade vermelha, metade azul-marinho, sobre transparente. */
async function logoPNG(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <rect x="20" y="20" width="160" height="80" fill="#d62828"/>
    <rect x="20" y="100" width="160" height="80" fill="#1d3557"/></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** Foto de 400 px de largura: pequena para o banner. */
async function smallJPEG(): Promise<Buffer> {
  return sharp({ create: { width: 400, height: 300, channels: 3, background: '#c08040' } })
    .jpeg()
    .toBuffer()
}

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
}

test.describe.serial('Sua marca', () => {
  let page: Page
  const requests: string[] = []

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    const logoFile = await logoPNG()
    const logo = await payload.create({
      collection: 'media',
      data: { alt: 'Logo' },
      file: {
        data: logoFile,
        mimetype: 'image/png',
        name: `logo-${SUFFIX}.png`,
        size: logoFile.length,
      },
      overrideAccess: true,
    })
    logoId = logo.id
    const photoFile = await smallJPEG()
    const photo = await payload.create({
      collection: 'media',
      data: { alt: 'Bolo de cenoura' },
      file: {
        data: photoFile,
        mimetype: 'image/jpeg',
        name: `bolo-${SUFFIX}.jpg`,
        size: photoFile.length,
      },
      overrideAccess: true,
    })
    photoId = photo.id
    const home = await payload.create({
      collection: 'pages',
      data: {
        title: `Sua marca ${SUFFIX}`,
        slug: `sua-marca-${SUFFIX}`,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Hero',
                props: {
                  id: 'Hero-m',
                  title: 'Bolos para festa',
                  highlight: '',
                  text: 'Feitos sob encomenda.',
                  image: { mediaId: photo.id },
                  button: null,
                  style: 'image',
                  align: 'left',
                  height: 'normal',
                },
              },
            ],
          },
        },
        _status: 'published',
      },
      overrideAccess: true,
    })
    homeId = home.id
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    previous = {
      ...(site.name ? { name: site.name } : {}),
      homepage: site.homepage ?? null,
      logo: site.logo ?? null,
      shareImage: site.shareImage ?? null,
      colors: site.colors,
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Doces da Ana',
        homepage: homeId,
        logo: logoId,
        shareImage: null,
        _status: 'published',
      },
      overrideAccess: true,
    })
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    page.on('request', (request) => requests.push(request.url()))
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
    if (homeId) {
      await payload.delete({
        collection: 'pages',
        id: homeId,
        overrideAccess: true,
        context: { seedRecreate: true },
      })
    }
    for (const id of [logoId, photoId].filter(Boolean)) {
      await payload.delete({ collection: 'media', id, overrideAccess: true })
    }
    await page?.close()
    await cleanupTestUser()
  })

  test('o menu tem "Sua marca" entre Páginas e Fotos', async () => {
    await open(page, '/admin')
    const links = page.locator('.gp-nav__link')
    const names = await links.allInnerTexts()
    const brand = names.findIndex((name) => name.trim() === 'Sua marca')
    expect(brand).toBe(names.findIndex((name) => name.trim() === 'Páginas') + 1)
    expect(names[brand + 1].trim()).toBe('Fotos')
  })

  test('lê as cores do logo no navegador e as combinações passam na leitura', async () => {
    requests.length = 0
    await open(page, '/admin/sua-marca')
    const swatches = page.getByRole('button', { name: /como cor principal$/ })
    await expect(swatches.first()).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: 'Usar #d62828 como cor principal' }),
    ).toHaveAttribute('aria-pressed', 'true')
    // Nada saiu para fora ao ler o logo: só o nosso servidor e as fontes das amostras.
    const outside = requests.filter(
      (url) => !url.startsWith(BASE) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url),
    )
    expect(outside).toEqual([])

    const combo = page.getByRole('button', { name: /^Claro e delicado/ })
    await combo.click()
    await expect(combo).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.gp-readings__mark--bad')).toHaveCount(0)

    // Tocar na outra cor do logo: a combinação em uso acompanha.
    await page.getByRole('button', { name: 'Usar #1d3557 como cor principal' }).click()
    await expect(combo).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.gp-readings__mark--bad')).toHaveCount(0)

    // A prévia mostra a página inicial de verdade.
    const preview = page.frameLocator('iframe[title="Prévia da sua marca"]')
    await expect(preview.locator('.hero__title')).toContainText('Bolos para festa')

    await expect(page.getByText('Guardado, falta publicar')).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(page.getByText('Sua marca foi publicada em todo o site.')).toBeVisible({
      timeout: 20_000,
    })
  })

  test('as letras sugeridas mudam a fonte dos títulos', async () => {
    await open(page, '/admin/sua-marca')
    const pair = page.locator('.gp-pair').first()
    await pair.click()
    await expect(pair).toHaveAttribute('aria-pressed', 'true')
  })

  test('Configurações não têm mais cores e letras', async () => {
    await open(page, '/admin/configuracoes')
    await expect(page.getByRole('heading', { name: 'Identidade' })).toBeVisible()
    await expect(page.getByText('Cores e letras')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Sua marca' }).last()).toBeVisible()
  })

  test('foto pequena no banner: aviso em Fotos e no Início', async () => {
    await open(page, '/admin/fotos')
    await expect(page.getByText('Foto pequena').first()).toBeVisible()
    await open(page, '/admin')
    await expect(page.getByText(/Troque as fotos pequenas/)).toBeVisible()
  })

  test('sem foto escolhida, o compartilhar usa a imagem gerada', async () => {
    await open(page, '/')
    const image = await page.locator('meta[property="og:image"]').first().getAttribute('content')
    expect(image).toContain(`/og/${homeId}`)
    const response = await page.request.get(`${BASE}/og/${homeId}`)
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    const meta = await sharp(await response.body()).metadata()
    expect([meta.width, meta.height]).toEqual([1200, 630])
  })

  test('Sua marca não rola para o lado', async () => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await open(page, '/admin/sua-marca')
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `${width} px`).toBeLessThanOrEqual(0)
    }
  })
})
