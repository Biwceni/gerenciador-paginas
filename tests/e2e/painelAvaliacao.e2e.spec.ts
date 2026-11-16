import { expect, type Page, test } from '@playwright/test'
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

// Avaliação e estresse do painel (decisões de 2026-11-16): sessão vencida (A2), duas abas (A3),
// internet que volta (B1), Descartar com confirmação (M4), contraste ao publicar (M7), redes sociais
// (M10), limite do menu (B2), Desfazer (B4), campos errados (B5), "Ir para" no celular (B8 v2),
// rascunho sem página (B9 v2), foto em folha no celular (M2) e Mensagens (B12). No banco de
// TEST_DATABASE_URL.

const BASE = 'http://localhost:3000'
const SUFFIX = Date.now()

type Saved = { header: unknown; footer: unknown; site: unknown }
let saved: Saved | null = null
const createdPages: number[] = []

const status = (page: Page) => page.locator('.gp-savestatus')

/** Abre a tela e espera o React assumir (antes disso, digitar não chega ao estado da tela). */
async function open(page: Page, path: string) {
  await page.goto(`${BASE}${path}`)
  await page.waitForFunction(() => {
    const field = document.querySelector('.gp-page input, .gp-page button')
    return Boolean(field && Object.keys(field).some((key) => key.startsWith('__reactFiber')))
  })
}

async function signIn(page: Page) {
  await login({ page, user: testUser })
}

test.describe('painel: avaliação e estresse de 2026-11-16', () => {
  test.beforeAll(async () => {
    await seedTestUser()
    const payload = await getPayload({ config })
    const [header, footer, site] = await Promise.all([
      payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true }),
      payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true }),
      payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true }),
    ])
    saved = { header, footer, site }
    // Banco zerado: sem nome, as Configurações já começam com um campo para corrigir e não publicam.
    if (!site.name) {
      await payload.updateGlobal({
        slug: 'site',
        data: { name: 'Site de teste', _status: 'published' },
        overrideAccess: true,
      })
    }
    await payload.updateGlobal({
      slug: 'header',
      data: {
        items: [{ label: 'WhatsApp', link: { kind: 'whatsapp' } }],
        button: { label: '' },
        _status: 'published',
      },
      overrideAccess: true,
    })
  })

  test.afterAll(async () => {
    const payload = await getPayload({ config })
    for (const id of createdPages) {
      await payload
        .delete({ collection: 'pages', id, overrideAccess: true, context: { seedRecreate: true } })
        .catch(() => undefined)
    }
    if (saved) {
      const strip = (value: unknown) => {
        const { id: _id, updatedAt: _u, createdAt: _c, globalType: _g, ...rest } = value as Record<
          string,
          unknown
        >
        return rest
      }
      await payload.updateGlobal({
        slug: 'header',
        data: { ...strip(saved.header), _status: 'published' },
        overrideAccess: true,
      })
      await payload.updateGlobal({
        slug: 'footer',
        data: { ...strip(saved.footer), _status: 'published' },
        overrideAccess: true,
      })
      // O site do banco de teste pode estar sem nome (inválido para salvar): aí fica como está.
      await payload
        .updateGlobal({
          slug: 'site',
          data: { ...strip(saved.site), _status: 'published' },
          overrideAccess: true,
        })
        .catch(() => undefined)
    }
    await cleanupTestUser()
  })

  test('A3: a segunda aba não apaga a mudança da primeira sem perguntar', async ({
    page,
    context,
  }) => {
    await signIn(page)
    const other = await context.newPage()
    await open(page, '/admin/menu-e-rodape')
    await open(other, '/admin/menu-e-rodape')
    await page.getByLabel('Frase do rodapé').fill(`Primeira aba ${SUFFIX}`)
    await expect(status(page)).toContainText('Guardado, falta publicar', { timeout: 15_000 })

    await other.getByLabel('Frase do rodapé').fill(`Segunda aba ${SUFFIX}`)
    const notice = other.locator('.gp-conflict')
    await expect(notice).toContainText('mudou em outra aba', { timeout: 15_000 })
    await expect(status(other)).toContainText('Não salvo: escolha a versão')
    await expect(other.getByRole('button', { name: 'Publicar menu e rodapé' })).toBeDisabled()

    await other.getByRole('button', { name: 'Manter a minha' }).click()
    await expect(notice).toHaveCount(0)
    await expect(status(other)).toContainText('Guardado, falta publicar', { timeout: 15_000 })
    const payload = await getPayload({ config })
    const footer = await payload.findGlobal({ slug: 'footer', draft: true, overrideAccess: true })
    expect(footer.text).toBe(`Segunda aba ${SUFFIX}`)
    await other.close()
  })

  test('B1 e A2: salva sozinho quando a internet volta e depois de entrar de novo', async ({
    page,
    context,
  }) => {
    await signIn(page)
    await open(page, '/admin/menu-e-rodape')
    await context.setOffline(true)
    await page.getByLabel('Frase do rodapé').fill(`Sem internet ${SUFFIX}`)
    await expect(status(page)).toContainText('Não deu para salvar', { timeout: 15_000 })
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(status(page)).toContainText('A internet voltou. Guardado, falta publicar', {
      timeout: 15_000,
    })

    // Sessão vencida: aviso certo, entrada por cima da tela e o que mudou é salvo depois.
    await context.clearCookies()
    await page.getByLabel('Frase do rodapé').fill(`Sessão vencida ${SUFFIX}`)
    const dialog = page.getByRole('dialog', { name: 'Sua sessão terminou' })
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    await expect(status(page)).toContainText('Sua sessão terminou')
    await dialog.getByLabel('E-mail').fill(testUser.email)
    await dialog.getByLabel('Senha', { exact: true }).fill(testUser.password)
    await dialog.getByRole('button', { name: 'Entrar de novo' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(status(page)).toContainText('Guardado, falta publicar', { timeout: 15_000 })
    const payload = await getPayload({ config })
    const footer = await payload.findGlobal({ slug: 'footer', draft: true, overrideAccess: true })
    expect(footer.text).toBe(`Sessão vencida ${SUFFIX}`)
  })

  test('B2, B4 e M4: limite explicado, Desfazer e Descartar com confirmação', async ({ page }) => {
    await signIn(page)
    await open(page, '/admin/menu-e-rodape')
    const add = page.getByRole('button', { name: 'Adicionar link' })
    while ((await page.locator('.gp-menuitem').count()) < 8) await add.click()
    await expect(add).toBeDisabled()
    await expect(page.locator('#hf-add-why')).toContainText('máximo que cabe no topo do site')

    const first = page.getByLabel('Texto do link 1')
    const label = await first.inputValue()
    await page.getByRole('button', { name: `Tirar ${label} do menu` }).first().click()
    await expect(page.locator('.gp-undo')).toContainText(`“${label}” saiu do menu`)
    // O foco vai para o link que ficou no lugar, não para o começo da página.
    await expect(page.getByLabel('Texto do link 1')).toBeFocused()
    await page.getByRole('button', { name: 'Desfazer' }).click()
    await expect(page.getByLabel('Texto do link 1')).toHaveValue(label)
    await expect(status(page)).toContainText('Guardado, falta publicar', { timeout: 15_000 })

    await page.getByRole('button', { name: 'Descartar mudanças' }).click()
    const confirm = page.getByRole('dialog', { name: /Descartar as mudanças de Menu e rodapé/ })
    await expect(confirm).toContainText('Não dá para desfazer')
    await confirm.getByRole('button', { name: 'Continuar mexendo' }).click()
    await expect(page.locator('.gp-menuitem')).toHaveCount(8)
    await page.getByRole('button', { name: 'Descartar mudanças' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Descartar', exact: true }).click()
    await expect(status(page)).toContainText('Tudo no ar', { timeout: 15_000 })
    await expect(page.locator('.gp-menuitem')).toHaveCount(1)
  })

  test('M10 e B5: redes ganham o https:// e os erros levam ao primeiro campo', async ({
    page,
  }) => {
    await signIn(page)
    await open(page, '/admin/configuracoes')
    await page.locator('#st-facebook').fill('facebook.com/loja-teste')
    await expect(page.locator('#st-facebook ~ .gp-hint')).toHaveText(
      'Vai ficar: https://facebook.com/loja-teste',
    )
    await page.locator('#st-facebook').blur()
    await expect(page.locator('#st-facebook')).toHaveValue('https://facebook.com/loja-teste')

    // Rede errada no campo: aviso do próprio campo.
    await page.locator('#st-youtube').fill('instagram.com/loja')
    await expect(page.locator('#st-youtube ~ .gp-hint--error')).toContainText(
      'não é do YouTube',
    )
    await page.locator('#st-email').fill('errado')
    await expect(page.locator('.gp-errorsummary')).toContainText('2 campos para corrigir')
    await page.getByRole('button', { name: 'Ir para o primeiro' }).click()
    await expect(page.locator('#st-email')).toBeFocused()
    await page.locator('#st-email').fill('')
    await page.locator('#st-youtube').fill('')
    await expect(page.locator('.gp-errorsummary')).toHaveCount(0)
    await expect(status(page)).toContainText('Guardado, falta publicar', { timeout: 15_000 })
    // Descartar volta ao que está no ar (M4), sem deixar rascunho para os outros testes.
    await page.getByRole('button', { name: 'Descartar mudanças' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Descartar', exact: true }).click()
    await expect(status(page)).toContainText('Tudo no ar', { timeout: 15_000 })
  })

  test('B8 v2: no celular, "Ir para" abre a lista dos blocos com o que falta', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signIn(page)
    await open(page, '/admin/configuracoes')
    const go = page.locator('.gp-blocknav__button')
    await expect(go).toContainText('Identidade')
    await go.click()
    const sheet = page.getByRole('dialog', { name: 'Ir para' })
    await expect(sheet.locator('[aria-current="location"]')).toContainText('Identidade')
    await expect(sheet).toContainText('Começar de novo')
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden')
    await sheet.getByRole('button', { name: /Contato/ }).click()
    await expect(sheet).toHaveCount(0)
    await expect(go).toContainText('Contato')
    await expect(page.locator('#st-contato h2')).toBeFocused()
  })

  test('M7: publicar com cor difícil de ler pede confirmação', async ({ page }) => {
    await signIn(page)
    await open(page, '/admin/sua-marca')
    await page.getByRole('button', { name: 'Ajustar cores à mão' }).click()
    const text = page.locator('#mc-hex-text')
    await text.fill('#dddddd')
    await text.blur()
    await expect(status(page)).toContainText('Guardado, falta publicar', { timeout: 15_000 })
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Publicar com partes difíceis de ler?' })
    await expect(dialog).toContainText('Texto sobre o fundo')
    await dialog.getByRole('button', { name: 'Voltar e ajustar' }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: 'Descartar mudanças' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Descartar', exact: true }).click()
    await expect(status(page)).toContainText('Tudo no ar', { timeout: 15_000 })
  })

  test('B9 v2: rascunho sem página fica fora das listas e volta como página', async ({
    page,
  }) => {
    const payload = await getPayload({ config })
    const page1 = await payload.create({
      collection: 'pages',
      data: { title: `Fantasma ${SUFFIX}`, slug: `fantasma-${SUFFIX}`, _status: 'draft' },
      draft: true,
      overrideAccess: true,
    })
    // O que sobrava antes: a versão sem página (como depois de uma queda no meio do apagar).
    await payload.db.drizzle.execute(
      sql`update _pages_v set parent_id = null where parent_id = ${page1.id}`,
    )
    await payload.db.drizzle.execute(sql`delete from pages where id = ${page1.id}`)

    const list = await payload.find({
      collection: 'pages',
      draft: true,
      limit: 1000,
      overrideAccess: true,
    })
    expect(list.docs.every((doc) => typeof doc.id === 'number')).toBe(true)

    await signIn(page)
    await open(page, '/admin/paginas')
    const notice = page.locator('.gp-orphans')
    await expect(notice).toContainText('Um rascunho ficou sem página')
    await expect(notice).toContainText(`Fantasma ${SUFFIX}`)
    await expect(page.locator('.gp-row__title', { hasText: `Fantasma ${SUFFIX}` })).toHaveCount(0)
    await notice.getByRole('button', { name: 'Recuperar como página' }).click()
    await expect(notice).toContainText('voltou como página, em rascunho')
    await expect(page.locator('.gp-row__title', { hasText: `Fantasma ${SUFFIX}` })).toBeVisible()
    const recovered = await payload.find({
      collection: 'pages',
      where: { title: { equals: `Fantasma ${SUFFIX}` } },
      draft: true,
      overrideAccess: true,
    })
    expect(recovered.docs).toHaveLength(1)
    expect(recovered.docs[0]._status).toBe('draft')
    createdPages.push(recovered.docs[0].id)

    // Apagar a página agora apaga as versões junto (vínculo em cascata).
    const recoveredId = recovered.docs[0].id
    await payload.delete({
      collection: 'pages',
      id: recoveredId,
      overrideAccess: true,
      context: { seedRecreate: true },
    })
    const left = await payload.db.drizzle.execute(
      sql`select count(*)::int as n from _pages_v where parent_id = ${recoveredId}`,
    )
    expect((left as unknown as { rows: { n: number }[] }).rows[0].n).toBe(0)
  })
})
