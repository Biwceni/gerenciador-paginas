import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 2b: M1 (grupos no menu, colunas de
// links no rodapé, linha de cima) e D3 (dados da empresa no rodapé). No banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const panel = () => getPayload({ config })
const SUFFIX = Date.now()

const pageIds: number[] = []
let previous: { header: object; footer: object; site: object } | null = null

const label30 = (text: string, n: number) => `${text} ${n}`.padEnd(30, '.').slice(0, 30)

async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
  // O aviso de segurança do Next em desenvolvimento cobre a tela e pega os cliques.
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {})
}

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

/** 8 grupos com 8 links de 30 letras, a linha de cima e 4 colunas com 8 links no rodapé. */
async function biggestMenu() {
  const payload = await panel()
  const [home, other] = pageIds
  await payload.updateGlobal({
    slug: 'header',
    data: {
      items: Array.from({ length: 8 }, (_, g) => ({
        label: label30('Grupo', g + 1),
        link: { kind: 'page' as const, page: null },
        children: Array.from({ length: 8 }, (_, c) => ({
          label: label30('Link do grupo', g * 8 + c),
          link: { kind: 'page' as const, page: c % 2 ? other : home },
        })),
      })),
      topBar: {
        phone: true,
        hours: true,
        linkLabel: 'Peça orçamento',
        link: { kind: 'page' as const, page: other },
      },
      _status: 'published',
    },
    overrideAccess: true,
  })
  await payload.updateGlobal({
    slug: 'footer',
    data: {
      showMenu: true,
      columns: Array.from({ length: 4 }, (_, c) => ({
        title: label30('Coluna', c + 1),
        links: Array.from({ length: 8 }, (_, l) => ({
          label: label30('Link da coluna', c * 8 + l),
          link: { kind: 'page' as const, page: other },
        })),
      })),
      _status: 'published',
    },
    overrideAccess: true,
  })
}

test.describe.serial('Etapa 2b: menu e rodapé', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    const payload = await panel()
    for (const name of ['Início', 'Serviços']) {
      const doc = await payload.create({
        collection: 'pages',
        data: {
          title: `${name} 2b ${SUFFIX}`,
          slug: `${name === 'Início' ? 'inicio' : 'servicos'}-2b-${SUFFIX}`,
          content: { version: CONTENT_VERSION, data: { root: { props: {} }, content: [] } },
          _status: 'published',
        },
        overrideAccess: true,
      })
      pageIds.push(doc.id)
    }
    const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
    const footer = await payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true })
    const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
    previous = {
      header: {
        items: header.items,
        button: header.button,
        notice: header.notice,
        topBar: header.topBar,
      },
      footer: { columns: footer.columns, showMenu: footer.showMenu },
      site: { homepage: site.homepage ?? null, contact: site.contact, company: site.company },
    }
    await payload.updateGlobal({
      slug: 'site',
      data: {
        homepage: pageIds[0],
        contact: { ...site.contact, phone: '(31) 3333-0000', hours: 'Seg a sex, 8h às 18h' },
        company: { legalName: null, cnpj: null, responsible: null },
        _status: 'published',
      },
      overrideAccess: true,
    })
    await payload.updateGlobal({
      slug: 'header',
      data: { notice: { text: null }, _status: 'published' },
      overrideAccess: true,
    })
    await biggestMenu()
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  })

  test.afterAll(async () => {
    const payload = await panel()
    if (previous) {
      for (const slug of ['header', 'footer', 'site'] as const) {
        await payload
          .updateGlobal({
            slug,
            data: { ...previous[slug], _status: 'published' },
            overrideAccess: true,
          })
          .catch(() => {})
      }
    }
    for (const id of pageIds) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => {})
    }
    await page?.close()
    await cleanupTestUser()
  })

  test('M1 no computador: grupo abre com Enter, Tab entra na lista, Esc fecha e volta ao botão', async () => {
    await open(page, '/')
    const groups = page.locator('.site-header__nav .site-header__groupbtn')
    await expect(groups).toHaveCount(8)
    expect(await overflow(page)).toBeLessThanOrEqual(0)

    const first = groups.first()
    await first.focus()
    await page.keyboard.press('Enter')
    await expect(first).toHaveAttribute('aria-expanded', 'true')
    const list = page.locator(`#${await first.getAttribute('aria-controls')}`)
    await expect(list).toBeVisible()
    await expect(list.getByRole('link')).toHaveCount(8)
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(() => Boolean(document.activeElement?.closest('.site-header__sub'))),
    ).toBe(true)
    await page.keyboard.press('Escape')
    await expect(first).toHaveAttribute('aria-expanded', 'false')
    await expect(first).toBeFocused()
    await expect(list).toBeHidden()

    // O último abre para a esquerda, sem sair da tela; tocar fora fecha.
    const last = groups.last()
    await last.click()
    const box = await page.locator(`#${await last.getAttribute('aria-controls')}`).boundingBox()
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(1440)
    await page.mouse.click(700, 860)
    await expect(last).toHaveAttribute('aria-expanded', 'false')

    // Linha de cima com telefone, horário e o link curto.
    const bar = page.locator('.site-topbar')
    await expect(bar).toContainText('(31) 3333-0000')
    await expect(bar).toContainText('Seg a sex, 8h às 18h')
    await expect(bar.getByRole('link', { name: 'Peça orçamento' })).toBeVisible()
  })

  test('M1 no celular: ☰ aberto com um grupo aberto; Esc fecha só o grupo', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    // No celular, a linha de cima fica numa linha só, sem o horário.
    await expect(page.locator('.site-topbar__hours')).toBeHidden()
    await page.getByRole('button', { name: /menu/i }).first().click()
    const group = page.locator('.site-header__mobile .site-header__groupbtn').nth(1)
    await group.click()
    await expect(group).toHaveAttribute('aria-expanded', 'true')
    await expect(
      page.locator(`#${await group.getAttribute('aria-controls')}`).getByRole('link'),
    ).toHaveCount(8)
    await page.keyboard.press('Escape')
    await expect(group).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('.site-header__mobile .site-header__groupbtn').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.site-header__mobile .site-header__groupbtn').first()).toBeHidden()
  })

  test('M1 no rodapé do celular: 4 colunas com título, sem rolar para o lado', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open(page, '/')
    const footer = page.locator('.site-footer')
    for (let c = 1; c <= 4; c++) {
      await expect(footer.getByRole('navigation', { name: label30('Coluna', c) })).toBeVisible()
    }
    // "Páginas" junta os links dos grupos sem repetir o mesmo endereço: só as 2 páginas.
    await expect(footer.getByRole('navigation', { name: 'Páginas' }).getByRole('link')).toHaveCount(
      2,
    )
    expect(await overflow(page)).toBeLessThanOrEqual(0)
    await page.setViewportSize({ width: 1440, height: 900 })
  })

  test('M1 no painel: um link vira grupo, ganha um link dentro e vai ao ar', async () => {
    const payload = await panel()
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: [
          { label: 'Serviços', link: { kind: 'page' as const, page: pageIds[1] }, children: [] },
        ],
        _status: 'published',
      },
      overrideAccess: true,
    })
    await login({ page, user: testUser })
    await open(page, '/admin/menu-e-rodape')
    await page.getByRole('button', { name: 'Pôr links dentro deste (vira um grupo)' }).click()
    const groupName = page.getByLabel('Nome do grupo 1')
    await expect(groupName).toBeFocused()
    await expect(page.getByRole('list', { name: 'Links dentro de Serviços' })).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar link em Serviços' }).click()
    await page.getByLabel('Texto do link 2 de Serviços').fill('Início')
    await expect(page.locator('.gp-savestatus')).toContainText('Guardado, falta publicar', {
      timeout: 20_000,
    })
    await page.getByRole('button', { name: 'Publicar menu e rodapé' }).click()
    await expect(page.getByText('Menu e rodapé publicados em todas as páginas.')).toBeVisible({
      timeout: 20_000,
    })
    const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
    expect(header.items?.[0]?.children?.map((child) => child.label)).toEqual(['Serviços', 'Início'])

    await open(page, '/')
    const group = page.locator('.site-header__nav .site-header__groupbtn')
    await expect(group).toHaveText('Serviços')
    await group.click()
    await expect(page.locator('.site-header__nav .site-header__sub').getByRole('link')).toHaveCount(
      2,
    )
  })

  test('D3: CNPJ inválido não deixa publicar; válido aparece formatado no rodapé', async () => {
    await open(page, '/admin/configuracoes')
    await page.getByLabel('Razão social').fill('Empresa Teste Ltda.')
    const cnpj = page.getByLabel('CNPJ', { exact: true })
    await cnpj.fill('11.222.333/0001-80')
    await expect(page.getByText('Confira o CNPJ: os números não batem.')).toBeVisible()
    await expect(cnpj).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('button', { name: 'Publicar configurações' })).toBeDisabled()

    await cnpj.fill('11222333000181')
    await cnpj.blur()
    await expect(cnpj).toHaveValue('11.222.333/0001-81')
    await expect(page.locator('.gp-savestatus')).toContainText('Guardado, falta publicar', {
      timeout: 20_000,
    })
    await page.getByRole('button', { name: 'Publicar configurações' }).click()
    await expect(page.getByText('Configurações publicadas em todo o site.')).toBeVisible({
      timeout: 20_000,
    })
    await open(page, '/')
    const line = page.locator('.site-footer__company')
    await expect(line).toHaveText('Empresa Teste Ltda. · CNPJ 11.222.333/0001-81')
    const style = await line.evaluate((el) => getComputedStyle(el).opacity)
    expect(style).toBe('1')
  })
})
