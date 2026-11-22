import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 2a: A3 (só o logo no topo), E1
// (segunda cor) e E2 (logo em qualquer fundo, tirar o fundo, ícone da aba). No banco de
// TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()

let logoId: number
let homeId: number
let previous: object | null = null
const madeMedia: number[] = []

/** Logo deitado (600 × 150) com fundo branco: um círculo azul e uma barra escura no lugar do nome. */
async function wideLogo(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="150">
    <rect width="600" height="150" fill="#ffffff"/>
    <circle cx="75" cy="75" r="45" fill="#1f5fc4"/>
    <rect x="150" y="55" width="400" height="40" rx="6" fill="#1d2a44"/></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
  // O aviso de segurança do Next em desenvolvimento cobre a tela e pega os cliques.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

async function publish(page: Page) {
  await expect(page.getByText('Guardado, falta publicar')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Sua marca foi publicada em todo o site.')).toBeVisible({
    timeout: 20_000,
  })
}

test.describe.serial('Etapa 2a: marca', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    const file = await wideLogo()
    const logo = await payload.create({
      collection: 'media',
      data: { alt: 'Logo' },
      file: { data: file, mimetype: 'image/png', name: `logo-2a-${SUFFIX}.png`, size: file.length },
      overrideAccess: true,
    })
    logoId = logo.id
    const home = await payload.create({
      collection: 'pages',
      data: {
        title: `Marca 2a ${SUFFIX}`,
        slug: `marca-2a-${SUFFIX}`,
        content: {
          version: CONTENT_VERSION,
          data: {
            root: { props: {} },
            content: [
              {
                type: 'Announcement',
                props: {
                  id: 'Ann-2a',
                  items: [{ text: 'Aviso de teste' }],
                  mode: 'static',
                  style: 'second',
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
      homepage: site.homepage ?? null,
      logo: site.logo ?? null,
      showNameWithLogo: site.showNameWithLogo ?? false,
      logoLight: site.logoLight ?? null,
      logoOnDark: site.logoOnDark ?? 'auto',
      colors: site.colors,
      logoRing: site.logoRing,
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        name: 'Ferragens Sul',
        homepage: homeId,
        logo: logoId,
        showNameWithLogo: false,
        logoLight: null,
        logoOnDark: 'auto',
        colors: { ...site.colors, footer: '#1d1b1a', background: '#fffdf9', second: null },
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
    if (homeId) {
      await payload.delete({
        collection: 'pages',
        id: homeId,
        overrideAccess: true,
        context: { seedRecreate: true },
      })
    }
    const extra = await payload.find({
      collection: 'media',
      where: { filename: { like: `logo-2a-${SUFFIX}` } },
      overrideAccess: true,
      depth: 0,
    })
    for (const id of new Set([logoId, ...madeMedia, ...extra.docs.map((doc) => doc.id)])) {
      if (id)
        await payload.delete({ collection: 'media', id, overrideAccess: true }).catch(() => {})
    }
    await page?.close()
    await cleanupTestUser()
  })

  test('A3: com logo, o topo do site mostra só o logo, do tamanho certo', async () => {
    await open(page, '/')
    const brand = page.locator('.site-header__brand')
    await expect(brand).toHaveClass(/site-header__brand--only/)
    // O nome continua no link, para o leitor de tela.
    await expect(brand).toHaveAccessibleName(/Ferragens Sul/)
    const logo = brand.locator('.site-header__logo').first()
    const box = await logo.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBe(44)
    expect(box?.width ?? 0).toBeLessThanOrEqual(200)

    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    const phone = await page.locator('.site-header__brand .site-header__logo').first().boundingBox()
    expect(Math.round(phone?.height ?? 0)).toBe(38)
    expect(phone?.width ?? 0).toBeLessThanOrEqual(160)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('Sua marca: opção do nome ao lado, prévia do topo no celular e ícone da aba', async () => {
    await open(page, '/admin/sua-marca')
    const toggle = page.getByLabel('Mostrar o nome ao lado do logo')
    await expect(toggle).not.toBeChecked({ timeout: 20_000 })
    await expect(page.getByText('O topo mostra só o logo.')).toBeVisible()
    const preview = page.frameLocator('iframe[title="Topo do site no celular"]')
    await expect(preview.locator('.site-header__brand--only')).toBeVisible()
    await expect(page.getByText('Ícone da aba do navegador')).toBeVisible()

    await toggle.check()
    await expect(preview.locator('.site-header__brand--only')).toHaveCount(0)
    await publish(page)
    await open(page, '/')
    await expect(page.locator('.site-header__brand')).not.toHaveClass(/site-header__brand--only/)
    await expect(page.locator('.site-header__brand')).toContainText('Ferragens Sul')
  })

  test('E2: o fundo branco do logo sai, com antes e depois, e vira uma foto nova', async () => {
    await open(page, '/admin/sua-marca')
    await page.getByRole('button', { name: 'Tirar o fundo do logo' }).click()
    const dialog = page.getByRole('dialog').filter({ hasText: 'Tirar o fundo do logo' })
    await expect(dialog.getByAltText('Logo com o fundo')).toBeVisible()
    await expect(dialog.getByAltText('Logo sem o fundo')).toBeVisible({ timeout: 15_000 })
    await dialog.getByRole('button', { name: 'Usar o logo sem fundo' }).click()
    await expect(dialog).toHaveCount(0, { timeout: 30_000 })
    await publish(page)

    const payload = await panel()
    const site = await payload.findGlobal({ slug: 'site', depth: 1, overrideAccess: true })
    const logo = site.logo as { id: number; filename?: string | null; url?: string | null }
    madeMedia.push(logo.id)
    expect(logo.id).not.toBe(logoId)
    expect(logo.filename).toContain('sem-fundo')
    // O canto da imagem nova é transparente.
    const file = await page.request.get(new URL(logo.url ?? '', BASE).toString())
    const { data, info } = await sharp(await file.body())
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(info.channels).toBe(4)
    expect(data[3]).toBe(0)
    // Sem fundo de uma cor só, a oferta some.
    await open(page, '/admin/sua-marca')
    await expect(page.getByRole('button', { name: 'Tirar o fundo do logo' })).toHaveCount(0)
  })

  test('E2: placa branca no rodapé escuro, com a amostra antes de escolher', async () => {
    await open(page, '/admin/sua-marca')
    const plate = page.getByLabel(/Placa branca atrás do logo/)
    await expect(page.locator('.gp-logodark__sample--white img')).toBeVisible()
    await plate.check()
    await publish(page)
    await open(page, '/')
    await expect(page.locator('.site-footer__logo--plate')).toBeVisible()
    await expect(page.locator('.site-footer__logo--ring')).toHaveCount(0)
  })

  test('E1: segunda cor na faixa de aviso, com a leitura das cores', async () => {
    await open(page, '/admin/sua-marca')
    const hand = page.getByRole('button', { name: 'Ajustar cores à mão' })
    if (await hand.count()) await hand.click()
    await page.locator('#mc-hex-second').fill('#ffe14d')
    await page.locator('#mc-hex-second').blur()
    await expect(page.getByText('Faixa de aviso na segunda cor')).toBeVisible()
    await publish(page)
    await open(page, '/')
    const vars = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('.site') as Element)
      return [
        style.getPropertyValue('--color-second').trim(),
        style.getPropertyValue('--color-on-second').trim(),
      ]
    })
    expect(vars[0]).toBe('#ffe14d')
    // Amarelo claro: as letras ficam na cor escura do texto, não em branco.
    expect(vars[1]).not.toBe('#ffffff')
    await expect(page.locator('.announce--second')).toHaveCSS(
      'background-color',
      'rgb(255, 225, 77)',
    )
  })

  test('Sua marca não rola para o lado no celular', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/admin/sua-marca')
    await expect(page.locator('.gp-logoopts')).toBeVisible({ timeout: 20_000 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
