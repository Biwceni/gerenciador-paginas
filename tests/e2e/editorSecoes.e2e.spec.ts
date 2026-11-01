import { expect, type Locator, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Editor no visual do protótipo v2 (entrega 2b), numa página de 5 seções sem fotos, no banco de
// TEST_DATABASE_URL. Cada teste recomeça da mesma página.

const BASE = 'http://localhost:3000'

const INITIAL = ['Hero-1', 'Features-1', 'Testimonials-1', 'Faq-1', 'CallToAction-1']

const initialContent = {
  version: CONTENT_VERSION,
  data: {
    root: { props: {} },
    zones: {},
    content: [
      {
        type: 'Hero',
        props: {
          id: 'Hero-1',
          title: 'Café especial da serra',
          text: 'Torrado toda semana.',
          button: { label: 'Fale com a gente', link: { kind: 'whatsapp' } },
          image: null,
          style: 'brand',
          align: 'left',
        },
      },
      {
        type: 'Features',
        props: {
          id: 'Features-1',
          menuLabel: '',
          title: 'Por que escolher a gente',
          items: [
            { title: 'Café especial', text: 'Grãos selecionados.' },
            { title: 'Entrega rápida', text: 'Em até dois dias.' },
            { title: 'Torra fresca', text: 'Toda semana.' },
          ],
          style: 'light',
        },
      },
      {
        type: 'Testimonials',
        props: {
          id: 'Testimonials-1',
          menuLabel: '',
          title: 'O que dizem',
          items: [{ quote: 'Muito bom.', name: 'Ana' }],
          style: 'soft',
        },
      },
      {
        type: 'Faq',
        props: {
          id: 'Faq-1',
          menuLabel: '',
          title: 'Perguntas',
          items: [{ question: 'Entregam no sábado?', answer: 'Sim.' }],
          style: 'light',
        },
      },
      {
        type: 'CallToAction',
        props: {
          id: 'CallToAction-1',
          menuLabel: '',
          title: 'Vamos conversar?',
          text: 'Chame a gente.',
          button: { label: 'Chamar', link: { kind: 'whatsapp' } },
          style: 'brand',
        },
      },
    ],
  },
}

let pageId: number

const sectionsIn = (page: Page) => page.frameLocator('iframe').locator('main [data-puck-component]')

/** A ordem da página, na prévia. As seções novas aparecem pelo tipo, sem o código do fim. */
async function order(page: Page): Promise<string[]> {
  const ids = await sectionsIn(page).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-puck-component') ?? ''),
  )
  return ids.map((id) => (id.endsWith('-1') ? id : id.split('-')[0]))
}

/** O que ficou salvo no banco, com os mesmos nomes. */
async function savedOrder(): Promise<string[]> {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({
    collection: 'pages',
    id: pageId,
    draft: true,
    depth: 0,
    overrideAccess: true,
  })
  const { data } = doc.content as typeof initialContent
  return data.content.map(({ props: { id } }) => (id.endsWith('-1') ? id : id.split('-')[0]))
}

async function openEditor(page: Page) {
  await page.goto(`${BASE}/admin/editor/${pageId}`)
  await expect(sectionsIn(page)).toHaveCount(INITIAL.length, { timeout: 120_000 })
}

/** Só a cópia da frente: o Puck desenha cada item da lista duas vezes. */
const listItem = (page: Page, name: string) =>
  page.locator('.ed-palitem:not([inert])', { hasText: name })

/** Escolhe a seção clicando na margem dela, onde não tem texto. */
async function selectSection(page: Page, index: number) {
  const section = sectionsIn(page).nth(index)
  await section.scrollIntoViewIfNeeded()
  // A rolagem de quem acabou de mudar de lugar ainda pode estar acontecendo.
  await page.waitForTimeout(600)
  const box = await section.boundingBox()
  if (!box) throw new Error('seção fora da tela')
  // Na margem esquerda: à direita fica a barra da seção, que gruda no topo ao rolar.
  const frame = await page.locator('iframe').boundingBox()
  await page.mouse.click(box.x + 8, Math.max(box.y, frame?.y ?? 0) + 40)
}

const inPreview = (page: Page) => page.frameLocator('iframe')

/** Arrasta com o mouse aos poucos, como a pessoa faria: o Puck só reage assim. */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x, from.y + 12, { steps: 4 })
  await page.mouse.move(to.x, to.y, { steps: 30 })
  await page.waitForTimeout(500)
  await page.mouse.move(to.x, to.y + 3, { steps: 3 })
  await page.waitForTimeout(300)
  await page.mouse.up()
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('elemento fora da tela')
  return box
}

test.describe.serial('editor: seções', () => {
  test.beforeAll(async () => {
    await seedTestUser()
    const payload = await getPayload({ config })
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Página do teste do editor',
        slug: `teste-editor-${Date.now()}`,
        content: initialContent,
        _status: 'draft',
      },
      draft: true,
      overrideAccess: true,
    })
    pageId = page.id
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    await payload.delete({
      collection: 'pages',
      id: pageId,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
    await cleanupTestUser()
  })

  test.beforeEach(async ({ page }) => {
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'pages',
      id: pageId,
      data: { content: initialContent },
      draft: true,
      overrideAccess: true,
    })
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.endsWith('/login'))
    await openEditor(page)
    // A página ainda está assentando logo depois de abrir.
    await expect(page.locator('.ed-palitem:not([inert])').first()).toBeVisible()
  })

  test('um clique na lista coloca a seção no fim e salva', async ({ page }) => {
    await expect(listItem(page, 'Vídeo do YouTube')).toContainText('Um vídeo do YouTube na página')
    await expect(listItem(page, 'Vídeo do YouTube').locator('svg')).toBeVisible()
    await listItem(page, 'Vídeo do YouTube').click()

    const expected = [...INITIAL, 'Video']
    await expect.poll(() => order(page)).toEqual(expected)
    await expect.poll(savedOrder).toEqual(expected)
    // A seção nova fica escolhida, com as opções dela à direita.
    await expect(page.getByRole('textbox', { name: 'Título' }).first()).toHaveValue(
      'Assista ao nosso vídeo',
    )
  })

  test('com uma seção selecionada, a lista coloca abaixo dela', async ({ page }) => {
    await expect(page.getByText('Clique para colocar no fim da página')).toBeVisible()
    await selectSection(page, 1)
    await expect(page.getByText('Clique para colocar abaixo de “Destaques”')).toBeVisible()

    await listItem(page, 'Texto simples').click()
    const first = [INITIAL[0], INITIAL[1], 'RichText', ...INITIAL.slice(2)]
    await expect.poll(() => order(page)).toEqual(first)
    await expect.poll(savedOrder).toEqual(first)

    // A nova fica selecionada: a seguinte entra abaixo dela, na ordem em que foram escolhidas.
    await expect(page.getByText('Clique para colocar abaixo de “Texto simples”')).toBeVisible()
    await listItem(page, 'Galeria de fotos').click()
    await expect
      .poll(() => order(page))
      .toEqual([INITIAL[0], INITIAL[1], 'RichText', 'Gallery', ...INITIAL.slice(2)])
  })

  test('sem o "+" entre as seções', async ({ page }) => {
    await expect(sectionsIn(page)).toHaveCount(INITIAL.length)
    await expect(inPreview(page).getByRole('button', { name: /Adicionar seção/ })).toHaveCount(0)
  })

  test('página vazia: a lista aberta orienta, e fechada tem botão', async ({ page }) => {
    const payload = await getPayload({ config })
    const empty = { ...initialContent, data: { ...initialContent.data, content: [] } }
    await payload.update({
      collection: 'pages',
      id: pageId,
      data: { content: empty },
      draft: true,
      overrideAccess: true,
    })
    await page.reload()
    const preview = inPreview(page)
    await expect(preview.getByText('Escolha uma seção na lista para começar.')).toBeVisible({
      timeout: 60_000,
    })
    await expect(preview.getByRole('button', { name: 'Adicionar seção' })).toHaveCount(0)

    await page.locator('nav li').getByText('Ordem', { exact: true }).click()
    await page.locator('nav li').getByText('Ordem', { exact: true }).click()
    await preview.getByRole('button', { name: 'Adicionar seção' }).click()
    await listItem(page, 'Banner principal').click()
    await expect.poll(async () => (await order(page)).length).toBe(1)
    await expect(preview.getByText('Página vazia')).toHaveCount(0)
  })

  test('subir, descer, duplicar e remover na barra da seção', async ({ page }) => {
    // Passar o mouse numa seção desenha outra barra, invisível: esta é a da seção escolhida.
    const action = (name: string) =>
      inPreview(page)
        .locator('[data-puck-overlay][class*="isSelected"]')
        .getByRole('button', { name, exact: true })

    await selectSection(page, 0)
    await expect(action('Subir')).toBeDisabled()
    await expect(action('Descer')).toBeEnabled()
    await action('Descer').click()
    await expect.poll(() => order(page)).toEqual([INITIAL[1], INITIAL[0], ...INITIAL.slice(2)])

    // A seção continua escolhida depois de mudar de lugar.
    await expect(page.getByRole('textbox', { name: 'Título' }).first()).toHaveValue(
      'Café especial da serra',
    )
    await action('Subir').click()
    await expect.poll(() => order(page)).toEqual(INITIAL)

    await selectSection(page, 4)
    await expect(action('Descer')).toBeDisabled()
    await expect(action('Subir')).toBeEnabled()

    await action('Duplicar').click()
    await expect.poll(async () => (await order(page)).length).toBe(INITIAL.length + 1)

    await action('Remover').click()
    await expect.poll(() => order(page)).toEqual(INITIAL)
    await expect.poll(savedOrder).toEqual(INITIAL)
  })

  test('as mesmas ações no fim das opções, com Desfazer ao remover', async ({ page }) => {
    const actions = page.locator('.ed-section-actions:visible')

    await selectSection(page, 1)
    await actions.getByRole('button', { name: 'Subir' }).click()
    await expect.poll(() => order(page)).toEqual([INITIAL[1], INITIAL[0], ...INITIAL.slice(2)])
    await expect(actions.getByRole('button', { name: 'Subir' })).toBeDisabled()

    await actions.getByRole('button', { name: 'Descer' }).click()
    await expect.poll(() => order(page)).toEqual(INITIAL)

    await actions.getByRole('button', { name: 'Duplicar' }).click()
    await expect.poll(async () => (await order(page)).length).toBe(INITIAL.length + 1)
    // O Puck guarda no histórico um instante depois da mudança.
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Desfazer', exact: true }).first().click()
    await expect.poll(() => order(page)).toEqual(INITIAL)

    await selectSection(page, 1)
    await actions.getByRole('button', { name: 'Remover' }).click()
    const left = [INITIAL[0], ...INITIAL.slice(2)]
    await expect.poll(() => order(page)).toEqual(left)
    // Sem seção escolhida: volta o resumo da página, e o aviso oferece desfazer.
    await expect(page.locator('.ed-summary:visible')).toContainText('4 seções')
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Desfazer', exact: true }).last().click()
    await expect.poll(() => order(page)).toEqual(INITIAL)
  })

  test('o Desfazer do aviso some na mudança seguinte, sem desfazer outra coisa', async ({
    page,
  }) => {
    const actions = page.locator('.ed-section-actions:visible')
    await selectSection(page, 1)
    await actions.getByRole('button', { name: 'Remover' }).click()
    const left = [INITIAL[0], ...INITIAL.slice(2)]
    await expect.poll(() => order(page)).toEqual(left)
    const undo = page.locator('[data-sonner-toast]').getByRole('button', { name: 'Desfazer' })
    await expect(undo).toBeVisible()

    await selectSection(page, 0)
    await page.getByRole('textbox', { name: 'Título' }).first().fill('Título novo')
    await expect(undo).toHaveCount(0)
    expect(await order(page)).toEqual(left)
  })

  test('encolher a janela com os dois painéis abertos recolhe um deles', async ({ page }) => {
    const left = page.locator('.ed-root [class*="Sidebar--left"]')
    await expect(left).toHaveClass(/isVisible/)
    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(left).not.toHaveClass(/isVisible/)
    await expect(page.locator('.ed-root [class*="Sidebar--right"]')).toHaveClass(/isVisible/)
    // A faixa da prévia continua igual: nada encolhe por escala.
    await expect.poll(async () => (await boxOf(page.locator('iframe'))).width).toBeGreaterThan(600)
  })

  test('aba Ordem: resumo do texto, setas e arrastar a linha', async ({ page }) => {
    await page.locator('nav li').getByText('Ordem', { exact: true }).click()
    const rows = page.locator('.ed-order__item')
    await expect(rows).toHaveCount(INITIAL.length)
    await expect(rows.nth(1)).toContainText('Destaques')
    await expect(rows.nth(1)).toContainText('Café especial, Entrega rápida…')

    await expect(rows.nth(0).getByRole('button', { name: /^Subir/ })).toBeDisabled()
    await expect(rows.nth(4).getByRole('button', { name: /^Descer/ })).toBeDisabled()

    await rows
      .nth(0)
      .getByRole('button', { name: /^Descer/ })
      .click()
    const afterArrow = [INITIAL[1], INITIAL[0], ...INITIAL.slice(2)]
    await expect.poll(() => order(page)).toEqual(afterArrow)
    await expect(rows.nth(1)).toContainText('Banner principal')

    await rows.nth(3).dragTo(rows.nth(0))
    const afterDrag = [afterArrow[3], afterArrow[0], afterArrow[1], afterArrow[2], afterArrow[4]]
    await expect.poll(() => order(page)).toEqual(afterDrag)
    await expect.poll(savedOrder).toEqual(afterDrag)

    // Clicar na linha escolhe a seção.
    await rows.nth(2).locator('.ed-order__name').click()
    await expect(rows.nth(2)).toHaveClass(/ed-order__item--on/)
    await expect(page.locator('.ed-section-actions:visible')).toBeVisible()
  })

  test('arrastar continua funcionando: da lista e dentro da prévia', async ({ page }) => {
    // Da lista até a borda entre a primeira e a segunda seção.
    const item = await boxOf(listItem(page, 'Depoimentos'))
    const hero = await boxOf(sectionsIn(page).nth(0))
    await drag(
      page,
      { x: item.x + item.width / 2, y: item.y + item.height / 2 },
      { x: hero.x + hero.width / 2, y: hero.y + hero.height - 10 },
    )
    await expect.poll(async () => (await order(page)).length).toBe(INITIAL.length + 1)
    const afterList = await order(page)
    expect(afterList[0]).toBe('Hero-1')
    expect(afterList).toContain('Testimonials')

    // Dentro da prévia: a primeira seção para baixo da segunda, segurando pelo canto.
    const first = await boxOf(sectionsIn(page).nth(0))
    const second = await boxOf(sectionsIn(page).nth(1))
    await drag(
      page,
      { x: first.x + first.width - 20, y: first.y + first.height / 2 },
      { x: second.x + second.width - 20, y: second.y + second.height * 0.8 },
    )
    await expect.poll(async () => (await order(page))[0]).not.toBe('Hero-1')
    // Ao soltar, o Puck desenha uma cópia por um instante: espera ela sumir.
    await expect.poll(async () => (await order(page)).sort()).toEqual([...afterList].sort())
  })

  test('nenhum texto do editor diz "bloco"', async ({ page }) => {
    const visible = async () => (await page.locator('.ed-root').innerText()).toLowerCase()
    expect(await visible()).not.toContain('bloco')
    await page.locator('nav li').getByText('Ordem', { exact: true }).click()
    expect(await visible()).not.toContain('bloco')
    await selectSection(page, 1)
    expect(await visible()).not.toContain('bloco')
    const titles = await page
      .locator('.ed-root [title]')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('title')))
    expect(titles.join(' ').toLowerCase()).not.toContain('bloco')
  })

  for (const width of [1366, 1024]) {
    test(`prévia em tamanho real, sem zoom, em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 768 })
      await openEditor(page)

      await expect(page.getByRole('group', { name: 'Tamanho da tela' })).toBeVisible()
      await expect(page.getByText('Tamanho real, sem zoom')).toBeVisible()
      await expect(page.locator('select')).toHaveCount(0)
      const scale = await page
        .locator('#puck-canvas-root')
        .evaluate((element) => getComputedStyle(element).transform)
      expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(scale)

      const before = await boxOf(page.locator('iframe'))
      await page.locator('nav li').getByText('Ordem', { exact: true }).click()
      await expect(page.locator('.ed-order__item').first()).toBeVisible()
      if (width < 1280) {
        // Sem espaço para os dois painéis: abre um e o outro recolhe, e a prévia não encolhe.
        await expect(page.locator('.ed-root [class*="Sidebar--right"]')).toHaveClass(
          /^(?!.*isVisible)/,
        )
        await expect
          .poll(async () => (await boxOf(page.locator('iframe'))).width)
          .toBe(before.width)
      }
    })
  }

  test('computador ou celular na prévia, sem encolher', async ({ page }) => {
    await page.getByRole('button', { name: 'Ver como celular' }).click()
    await expect.poll(async () => (await boxOf(page.locator('iframe'))).width).toBe(390)
    await page.getByRole('button', { name: 'Ver como computador' }).click()
    await expect.poll(async () => (await boxOf(page.locator('iframe'))).width).toBeGreaterThan(390)
  })

  test('botão Opções recolhe e abre o painel da direita', async ({ page }) => {
    const before = await boxOf(page.locator('iframe'))
    const options = page.locator('.ed-rail-btn')
    await options.dispatchEvent('click')
    await expect(options).toHaveAttribute('aria-pressed', 'false')
    await expect
      .poll(async () => (await boxOf(page.locator('iframe'))).width)
      .toBeGreaterThan(before.width)
    await options.dispatchEvent('click')
    await expect(options).toHaveAttribute('aria-pressed', 'true')
  })

  test.describe('no celular (390 px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openEditor(page)
    })

    test('topo só com voltar, nome e Publicar, e o resto no menu ⋯', async ({ page }) => {
      const top = page.locator('.ed-top')
      await expect(top.getByRole('link', { name: 'Voltar para as páginas' })).toBeVisible()
      await expect(top.getByText('Página do teste do editor')).toBeVisible()
      await expect(top.getByRole('button', { name: 'Publicar' })).toBeVisible()
      for (const name of ['Desfazer', 'Refazer', 'Versões', 'Página e Google']) {
        await expect(top.getByRole('button', { name })).toBeHidden()
      }

      await page.getByRole('button', { name: 'Mais opções do editor' }).click()
      const menu = page.getByRole('dialog')
      await expect(menu.getByRole('button', { name: 'Desfazer' })).toBeDisabled()
      await expect(menu.getByRole('button', { name: 'Refazer' })).toBeDisabled()
      await menu.getByRole('button', { name: 'Página e Google' }).click()
      await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('Página e Google')
    })

    test('prévia na largura da tela, sem cortar o lado direito', async ({ page }) => {
      const frame = await boxOf(page.locator('iframe'))
      expect(frame.x).toBe(0)
      expect(frame.width).toBe(390)
      const overflow = await inPreview(page)
        .locator('body')
        .evaluate((body) => {
          const view = body.ownerDocument.defaultView as Window
          return (
            body.ownerDocument.documentElement.scrollWidth > view.innerWidth ||
            [...body.querySelectorAll('main *')].some(
              (element) => element.getBoundingClientRect().right > view.innerWidth + 1,
            )
          )
        })
      expect(overflow).toBe(false)
    })

    test('barra de baixo com os nomes inteiros, e o topo sempre à vista', async ({ page }) => {
      const bar = page.locator('nav li')
      await expect(bar).toHaveCount(3)
      // O texto escondido no celular ("seção") não conta: só o que está na tela.
      await expect(bar.nth(0)).toHaveText('Adicionar', { useInnerText: true })
      await expect(bar.nth(1)).toHaveText('Ordem', { useInnerText: true })
      await expect(bar.nth(2)).toHaveText('Opções', { useInnerText: true })
      for (const index of [0, 1, 2]) {
        const label = bar.nth(index).locator('[class*="NavItem-link_"]')
        const fits = await label.evaluate((element) => element.scrollWidth <= element.clientWidth)
        expect(fits).toBe(true)
      }

      await bar.nth(0).click()
      await expect(page.getByRole('heading', { name: 'Adicionar seção' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Publicar' })).toBeInViewport()
      await listItem(page, 'Texto simples').click()
      await expect.poll(() => order(page)).toEqual([...INITIAL, 'RichText'])
      // Depois de adicionar, a lista fecha para mostrar a seção.
      await expect(page.getByRole('heading', { name: 'Adicionar seção' })).toBeHidden()

      await bar.nth(2).click()
      await expect(page.locator('.ed-section-actions:visible')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Publicar' })).toBeInViewport()
    })
  })
})
