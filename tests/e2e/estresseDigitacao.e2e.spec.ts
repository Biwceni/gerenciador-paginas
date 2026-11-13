import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Achado 13.5 do teste de estresse: digitar numa página grande (40 seções) fica lento no celular.
// Mede o tempo entre a tecla e a tela desenhar de novo, com o processador 4x mais lento, como um
// celular simples. Na rodada 13 a mediana foi 380 ms, contra 98 ms numa página de uma seção.
// Aqui o servidor é o de desenvolvimento, bem mais lento que o site no ar, então o teste compara
// a página grande com uma de uma seção, medidas do mesmo jeito: a grande pode ser no máximo 30%
// mais lenta (ou ficar em 100 ms). `test.fail()` sai quando a correção chegar.

const BASE = 'http://localhost:3000'
const BUDGET_MS = 100
const MAX_RATIO = 1.3

const words = (n: number, make: (i: number) => object) =>
  Array.from({ length: n }, (_, i) => make(i))

const HERO = {
  type: 'Hero',
  props: {
    id: 'Hero-a1',
    title: 'Página grande',
    text: 'Teste de desempenho.',
    image: null,
    button: null,
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    anim: 'site',
  },
}

/** Banner + 39 seções: Cardápio (8 grupos de 30 itens), Perguntas, Destaques e Depoimentos. */
function bigPage() {
  const content: object[] = [HERO]
  for (let i = 0; i < 39; i++) {
    const base = { id: '', menuLabel: '', style: 'light', anim: 'site' }
    switch (i % 4) {
      case 0:
        content.push({
          type: 'PriceList',
          props: {
            ...base,
            id: `PriceList-${i}`,
            title: `Cardápio ${i}`,
            text: '',
            columns: 'two',
            leader: 'dots',
            groups: words(8, (g) => ({
              name: `Grupo ${g + 1}`,
              image: null,
              items: words(30, (n) => ({
                name: `Item ${g + 1}.${n + 1}`,
                description: 'Descrição curta do item.',
                price: 'R$ 12,00',
              })),
            })),
          },
        })
        break
      case 1:
        content.push({
          type: 'Faq',
          props: {
            ...base,
            id: `Faq-${i}`,
            title: `Perguntas ${i}`,
            items: words(12, (n) => ({
              question: `Pergunta ${n}?`,
              answer: 'Resposta com algumas palavras para ocupar espaço.',
            })),
          },
        })
        break
      case 2:
        content.push({
          type: 'Features',
          props: {
            ...base,
            id: `Features-${i}`,
            title: `Destaques ${i}`,
            marker: 'number',
            items: words(6, (n) => ({
              title: `Passo ${n}`,
              text: 'Explique em uma frase.',
              icon: 'check',
              photo: null,
            })),
          },
        })
        break
      default:
        content.push({
          type: 'Testimonials',
          props: {
            ...base,
            id: `Testimonials-${i}`,
            title: `Depoimentos ${i}`,
            items: words(8, (n) => ({
              quote: 'Gostei muito do atendimento e do bolo.',
              name: `Cliente ${n}`,
              photo: null,
            })),
          },
        })
    }
  }
  return content
}

const pageIds: number[] = []

async function createPage(content: object[]) {
  const payload = await getPayload({ config })
  const doc = await payload.create({
    collection: 'pages',
    data: {
      title: 'Teste de digitação',
      slug: `digitacao-${Date.now()}-${pageIds.length}`,
      content: { version: CONTENT_VERSION, data: { root: { props: {} }, content } },
      _status: 'draft',
    },
    draft: true,
    overrideAccess: true,
  })
  pageIds.push(doc.id)
  return doc.id
}

/** Abre o editor no celular, escolhe o banner e mede cada letra digitada no título. */
async function medianLatency(page: Page, id: number, count: number): Promise<number> {
  await page.goto(`${BASE}/admin/editor/${id}`)
  const sections = page
    .frameLocator('iframe')
    .first()
    .locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')
  await expect(sections).toHaveCount(count, { timeout: 240_000 })
  await page.waitForTimeout(3_000)

  await sections.first().click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(1_200)
  const panel = page.locator('form[class*="_PuckFields_"]:visible')
  if (!(await panel.count())) {
    await page.locator('[class*="NavItem-link"]', { hasText: 'Opções' }).first().click()
    await page.waitForTimeout(1_000)
  }
  await panel.locator('input[type="text"]').first().click()
  await page.keyboard.press('End')

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const latencies: number[] = []
  for (const char of ' com bolos e doces') {
    const start = Date.now()
    await page.keyboard.type(char)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(true))))
    latencies.push(Date.now() - start)
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  latencies.sort((a, b) => a - b)
  return latencies[Math.floor(latencies.length / 2)]
}

test.describe('editor: digitar numa página grande', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    for (const id of pageIds) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
    await cleanupTestUser()
  })

  test('13.5 digitar na página de 40 seções é tão rápido quanto numa de uma seção', async ({
    page,
  }) => {
    test.fail()
    test.setTimeout(500_000)
    const small = await createPage([HERO])
    const big = await createPage(bigPage())
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL((url) => !url.pathname.endsWith('/login'))

    const smallMedian = await medianLatency(page, small, 1)
    const bigMedian = await medianLatency(page, big, 40)
    const limit = Math.max(BUDGET_MS, Math.round(smallMedian * MAX_RATIO))
    test.info().annotations.push({
      type: 'digitação',
      description: `mediana: 1 seção ${smallMedian} ms, 40 seções ${bigMedian} ms (limite ${limit} ms)`,
    })
    expect(bigMedian).toBeLessThanOrEqual(limit)
  })
})
