import { expect, type Page, test } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { CONTENT_VERSION } from '../../src/puck/schema.js'
import type { Header } from '../../src/payload-types.js'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 1b: A5 (o editor não perde o que
// foi digitado), A6 (menu junto das páginas) e A7 (texto de exemplo com o lugar), mais o extra
// "Mudanças de agora". No banco de TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()
const created: number[] = []
let pageCount = 0
let previousHeader: Record<string, unknown> | null = null

const hero = (id: string, extra: Record<string, unknown> = {}) => ({
  type: 'Hero',
  props: {
    id,
    title: 'Banner da página de teste',
    text: 'Texto nosso, escrito por nós.',
    image: null,
    button: { label: '', link: null },
    style: 'light',
    align: 'left',
    height: 'compact',
    highlight: '',
    ...extra,
  },
})

const faq = (id: string) => ({
  type: 'Faq',
  props: {
    id,
    menuLabel: '',
    title: 'Dúvidas',
    style: 'light',
    anim: 'site',
    items: [
      { question: 'Qual o prazo?', answer: 'Três dias úteis.' },
      { question: 'Nova pergunta?', answer: 'Escreva a resposta aqui.' },
    ],
  },
})

const wrap = (content: unknown[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content },
})

async function createPage(
  content: unknown[],
  status: 'draft' | 'published' = 'draft',
  title = `Etapa 1b ${pageCount + 1}`,
) {
  const payload = await getPayload({ config })
  const slug = `etapa1b-${SUFFIX}-${++pageCount}`
  const doc = await payload.create({
    collection: 'pages',
    data: { title, slug, content: wrap(content), _status: status },
    draft: status === 'draft',
    overrideAccess: true,
  })
  created.push(doc.id)
  return { id: doc.id, slug, title }
}

async function savedPage(id: number) {
  const payload = await getPayload({ config })
  return payload.findByID({ collection: 'pages', id, draft: true, depth: 0, overrideAccess: true })
}

async function header() {
  const payload = await getPayload({ config })
  return payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })
}

/** Menu publicado com estes itens (cada um levando para uma página). */
async function setMenu(items: { label: string; page: number }[]) {
  const payload = await getPayload({ config })
  await payload.updateGlobal({
    slug: 'header',
    data: {
      items: items.map((item) => ({
        label: item.label,
        link: { kind: 'page' as const, page: item.page },
      })),
      _status: 'published',
    },
    overrideAccess: true,
  })
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/admin/login`)
  await page.fill('#lg-email', testUser.email)
  await page.fill('#lg-pass', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

const preview = (page: Page) => page.frameLocator('.ed-root iframe').first()
const sections = (page: Page) =>
  preview(page).locator('[data-puck-dropzone="root:default-zone"] > [data-puck-component]')
const dialog = (page: Page) => page.locator('.ed-overlay [role="dialog"]').last()

async function openEditor(page: Page, id: number, count: number) {
  await page.goto(`${BASE}/admin/editor/${id}`)
  await expect(sections(page)).toHaveCount(count, { timeout: 180_000 })
  await page.waitForTimeout(1500)
}

async function pick(page: Page, index: number) {
  const target = sections(page).nth(index)
  await target.scrollIntoViewIfNeeded()
  await target.click({ position: { x: 6, y: 6 } })
  await page.waitForTimeout(800)
}

const focusedName = (page: Page) =>
  page.evaluate(() => document.activeElement?.closest('[data-name]')?.getAttribute('data-name'))

test.describe('editor e painel: propostas, etapa 1b', () => {
  test.beforeAll(async () => {
    await seedTestUser()
    const current = await header()
    previousHeader = { items: current.items ?? [], button: current.button ?? null }
  })

  test.afterEach(async () => {
    const payload = await getPayload({ config })
    if (previousHeader) {
      await payload.updateGlobal({
        slug: 'header',
        data: {
          items: previousHeader.items as Header['items'],
          _status: 'published',
        },
        overrideAccess: true,
      })
    }
    for (const id of created.splice(0)) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('A5: sair do campo salva já e mostra "Guardado" só nele, por 3 s', async ({ page }) => {
    const { id } = await createPage([hero('Hero-a5')])
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    const text = page.locator('.ed-counted[data-name="text"]:visible textarea')
    await text.fill('Texto que não pode se perder.')
    await page.keyboard.press('Tab')
    const note = page.locator('.ed-counted[data-name="text"]:visible .ed-saved-note')
    await expect(note).toHaveText(/Guardado/, { timeout: 5000 })
    await expect(page.locator('.ed-saved-note:visible', { hasText: 'Guardado' })).toHaveCount(1)
    await expect
      .poll(async () => JSON.stringify((await savedPage(id)).content))
      .toContain('Texto que não pode se perder.')
    await expect(note).toHaveText('', { timeout: 5000 })
  })

  test('A5: botão vazio vira convite, e item novo da lista já abre para escrever', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-btn'), faq('Faq-new')])
    await signIn(page)
    await openEditor(page, id, 2)
    await pick(page, 0)
    // O banner tem o botão e, desde a etapa 3a, o segundo botão: o convite do primeiro.
    const invite = page.locator('.ed-add-optional:visible').first()
    await expect(invite).toContainText('Pôr um botão (opcional)')
    await invite.click()
    expect(await focusedName(page)).toBe('button.label')

    await pick(page, 1)
    await page
      .locator('.ed-list[data-name="items"]:visible [class*="ArrayField-addButton"]')
      .first()
      .click()
    await expect.poll(() => focusedName(page)).toBe('items[2].question')
  })

  test('A7: a lista diz o texto e o lugar, leva até o campo e "Manter assim" tira do aviso', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-a7'), faq('Faq-a7')])
    await signIn(page)
    await openEditor(page, id, 2)
    const box = page.locator('.ed-examples:visible')
    await expect(box.locator('h2')).toHaveText('2 textos de exemplo para trocar')
    await expect(box).toContainText('Perguntas frequentes › pergunta 2')
    await expect(box).toContainText('Nova pergunta?')
    const answer = box.locator('li', { hasText: 'resposta 2' })
    await answer.getByRole('button', { name: 'Ir até o texto' }).click()
    await expect.poll(() => focusedName(page)).toBe('items[1].answer')

    await page.keyboard.press('Escape')
    await page.locator('.ed-top a[aria-label="Voltar para as páginas"]').focus()
    await page.goto(`${BASE}/admin/editor/${id}`)
    await expect(sections(page)).toHaveCount(2, { timeout: 180_000 })
    await box
      .locator('li', { hasText: 'pergunta 2' })
      .getByRole('button', { name: 'Manter assim' })
      .click()
    await expect(box.locator('h2')).toHaveText('1 texto de exemplo para trocar')
    await expect
      .poll(async () => JSON.stringify((await savedPage(id)).content))
      .toContain('"keptTexts":["Nova pergunta?"]')
  })

  test('A6: menu cheio pergunta qual link sai; renomear pergunta se troca no menu', async ({
    page,
  }) => {
    const others = []
    for (let i = 0; i < 8; i++) others.push(await createPage([hero(`Hero-m${i}`)], 'published'))
    await setMenu(others.map((other, index) => ({ label: `Link ${index + 1}`, page: other.id })))
    const mine = await createPage([hero('Hero-mine')], 'draft', 'Trabalhe conosco')
    await signIn(page)
    await openEditor(page, mine.id, 1)
    await page.locator('.ed-top button', { hasText: 'Publicar' }).click()
    await expect(
      dialog(page).getByLabel('Colocar esta página no menu do topo e do rodapé'),
    ).toBeChecked()
    await dialog(page).getByRole('button', { name: 'Continuar' }).click()
    await expect(dialog(page)).toContainText('O menu já tem 8 links')
    await expect(dialog(page)).toContainText(
      'Para entrar “Trabalhe conosco”, escolha qual link sai do topo.',
    )
    await expect(dialog(page).getByLabel('Link 8')).toBeChecked()
    await dialog(page).getByLabel('Link 3').check()
    await dialog(page).getByRole('button', { name: 'Publicar com “Trabalhe conosco”' }).click()
    await expect(dialog(page)).toContainText('no lugar de “Link 3”')
    const after = (await header()).items ?? []
    expect(after.map((item) => item.label)).toEqual([
      'Link 1',
      'Link 2',
      'Link 4',
      'Link 5',
      'Link 6',
      'Link 7',
      'Link 8',
      'Trabalhe conosco',
    ])
    await dialog(page).getByRole('button', { name: 'Continuar editando' }).click()

    await page.locator('.ed-top button', { hasText: 'Página e Google' }).click()
    await dialog(page).locator('.ed-field input').first().fill('Vagas abertas')
    await dialog(page).getByRole('button', { name: 'Salvar' }).click()
    await expect(dialog(page)).toContainText('Trocar também no menu?')
    await expect(dialog(page).locator('.ed-menu-preview__new')).toHaveText('Vagas abertas')
    await dialog(page).getByRole('button', { name: 'Trocar no menu também' }).click()
    await expect.poll(async () => (await header()).items?.at(-1)?.label).toBe('Vagas abertas')
  })

  test('A6: página de campanha não vem marcada para o menu, e ficar fora não é aviso', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-camp', { title: 'Promoção de inverno' })])
    const payload = await getPayload({ config })
    await payload.update({
      collection: 'pages',
      id,
      data: { campaign: true },
      draft: true,
      overrideAccess: true,
    })
    await setMenu([])
    await signIn(page)
    await openEditor(page, id, 1)
    await page.locator('.ed-top button', { hasText: 'Publicar' }).click()
    const toggle = dialog(page).getByLabel('Colocar esta página no menu do topo e do rodapé')
    await expect(toggle).not.toBeChecked()
    await expect(dialog(page).getByRole('button', { name: 'Publicar agora' })).toBeVisible()
  })

  test('A6: arquivar tira do menu e libera o endereço; restaurar volta para ele', async ({
    page,
  }) => {
    const target = await createPage([hero('Hero-arch')], 'published', 'Página que sai')
    await setMenu([{ label: 'Página que sai', page: target.id }])
    await signIn(page)
    await page.goto(`${BASE}/admin/paginas`)
    const row = page.locator('li', { hasText: 'Página que sai' }).first()
    await row.getByRole('button', { name: /Mais opções/ }).click()
    await page.getByRole('menuitem', { name: 'Arquivar (sai do site, do menu e da lista)' }).click()
    // O aviso do Next (modo dev) também é um role=dialog: busca pelo texto da confirmação.
    const confirm = page.getByRole('dialog').filter({ hasText: 'O link dela sai do menu' })
    await expect(confirm).toContainText('O link dela sai do menu e do rodapé.')
    await confirm.getByRole('button', { name: 'Arquivar', exact: true }).click()
    await expect
      .poll(async () => (await savedPage(target.id)).slug)
      .toBe(`${target.slug}-arquivada-${target.id}`)
    expect((await header()).items ?? []).toEqual([])

    const payload = await getPayload({ config })
    const latest = await savedPage(target.id)
    await payload.update({
      collection: 'pages',
      id: target.id,
      data: { title: latest.title, slug: latest.slug, archived: false, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    expect((await savedPage(target.id)).slug).toBe(target.slug)
  })

  test('extra do A5: "Mudanças de agora" lista os passos e volta até um deles', async ({
    page,
  }) => {
    const { id } = await createPage([hero('Hero-hist')])
    await signIn(page)
    await openEditor(page, id, 1)
    await pick(page, 0)
    const title = page.locator('.ed-counted[data-name="title"]:visible textarea')
    await title.fill('Primeiro título')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(800)
    await title.fill('Segundo título')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(800)
    await page.locator('.ed-top button', { hasText: 'Versões' }).click()
    const steps = dialog(page).locator('.ed-history__step')
    await expect(steps.first()).toContainText('Mudou em Banner principal: título')
    await expect(steps.first()).toContainText('Agora')
    await steps.nth(1).getByRole('button', { name: 'Voltar até aqui' }).click()
    await expect
      .poll(async () => JSON.stringify((await savedPage(id)).content))
      .toContain('Primeiro título')
  })
})
