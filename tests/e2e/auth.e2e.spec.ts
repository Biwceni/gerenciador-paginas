import { expect, test } from '@playwright/test'

// O aviso é o `.gp-warnbox`: o anúncio de rota do Next também tem `role="alert"`.

import { WRONG_LOGIN_MESSAGE } from '../../src/lib/auth'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'
import { login } from '../helpers/login'
import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

const BASE = 'http://localhost:3000'

// Telas de entrar e senha (v2, entrega 1). Rodam no banco de TEST_DATABASE_URL.
test.describe('Entrar e senha', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('a tela de entrar segue o protótipo', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    await expect(page.getByRole('heading', { name: 'Entrar no seu site' })).toBeVisible()
    await expect(page.getByText('Use o e-mail que recebeu o convite.')).toBeVisible()
    await expect(page.getByText('Gerenciador de Páginas')).toBeVisible()
    await expect(page.locator('label[for="lg-email"]')).toHaveText('E-mail')
  })

  test('senha errada e e-mail sem conta têm a mesma mensagem', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', 'ninguem@exemplo.com.br')
    await page.fill('#lg-pass', 'qualquer-coisa-1')
    await page.click('button[type="submit"]')
    await expect(page.locator('.gp-warnbox')).toHaveText(WRONG_LOGIN_MESSAGE)

    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', 'senha-errada-1')
    await page.click('button[type="submit"]')
    await expect(page.locator('.gp-warnbox')).toHaveText(WRONG_LOGIN_MESSAGE)
  })

  // Ajustes da avaliação do Impeccable (08/11/2026).
  test('no celular, os campos têm letra de 16 px (o iPhone não amplia a tela)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE}/admin/login`)
    for (const id of ['#lg-email', '#lg-pass']) {
      const size = await page
        .locator(id)
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
      expect(size).toBeGreaterThanOrEqual(16)
    }
  })

  test('o olho mostra e esconde a senha', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    const password = page.locator('#lg-pass')
    const toggle = page.locator('.gp-pwinput__toggle')
    await password.fill('qualquer-coisa-1')
    await expect(password).toHaveAttribute('type', 'password')
    await expect(toggle).toHaveAttribute('aria-label', 'Mostrar senha')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await toggle.click()
    await expect(password).toHaveAttribute('type', 'text')
    await expect(toggle).toHaveAttribute('aria-label', 'Esconder senha')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(password).toHaveAttribute('autocomplete', 'current-password')

    await toggle.click()
    await expect(password).toHaveAttribute('type', 'password')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  test('depois da senha errada, a senha some e o cursor vai para ela', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    await page.fill('#lg-email', testUser.email)
    await page.fill('#lg-pass', 'senha-errada-1')
    // Mostrando a senha: ao entrar, ela volta a ficar escondida.
    await page.click('.gp-pwinput__toggle')
    await page.click('button[type="submit"]')
    await expect(page.locator('.gp-warnbox--danger[role="alert"]')).toHaveText(WRONG_LOGIN_MESSAGE)
    await expect(page.locator('#lg-email')).toHaveValue(testUser.email)
    await expect(page.locator('#lg-pass')).toHaveValue('')
    await expect(page.locator('#lg-pass')).toHaveAttribute('type', 'password')
    await expect(page.locator('#lg-pass')).toBeFocused()
  })

  test('enviar vazio mostra os dois problemas na caixa de erro', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    await page.click('button[type="submit"]')
    await expect(page.locator('#lg-email-problem')).toHaveClass(/gp-warnbox--danger/)
    await expect(page.locator('#lg-pass-problem')).toHaveClass(/gp-warnbox--danger/)
    await expect(page.locator('#lg-email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#lg-pass')).toHaveAttribute('aria-invalid', 'true')
  })

  test('"Esqueci minha senha" tem 44 px de altura para o dedo', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    const box = await page.getByRole('link', { name: 'Esqueci minha senha' }).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  })

  test('o painel diz que a página está em pt-BR', async ({ page }) => {
    await page.goto(`${BASE}/admin/login`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  })

  test('esqueci a senha não diz se o e-mail existe', async ({ page }) => {
    await page.goto(`${BASE}/admin/forgot`)
    await page.fill('#fg-email', 'ninguem@exemplo.com.br')
    await page.click('button[type="submit"]')
    await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()
  })

  test('link vencido e link antigo do Payload', async ({ page }) => {
    await page.goto(`${BASE}/admin/reset/token-que-nao-existe`)
    await expect(page).toHaveURL(`${BASE}/admin/nova-senha/token-que-nao-existe`)
    await expect(page.getByRole('heading', { name: 'Este link venceu' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Pedir um link novo' })).toBeVisible()
  })

  // Avaliação Impeccable, rodada 1 (telas A2 a A7).
  test('esqueci a senha: título, e-mail digitado, foco e reenvio', async ({ page }) => {
    await page.goto(`${BASE}/admin/forgot`)
    await expect(page.getByRole('heading', { name: 'Esqueci minha senha' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar para entrar' })).toBeVisible()
    await page.fill('#fg-email', 'ninguem@exemplo.com.br')
    await page.click('button[type="submit"]')
    const title = page.getByRole('heading', { name: 'Confira seu e-mail' })
    await expect(title).toBeFocused()
    await expect(page.locator('.gp-authcard__head')).toContainText('ninguem@exemplo.com.br')
    const resend = page.getByRole('button', { name: 'Enviar de novo' })
    await expect(resend).toBeDisabled()
    await expect(page.locator('#fg-wait')).toContainText('Você pode enviar de novo em')
  })

  test('criar senha: olho nos dois campos e regras neutras antes de digitar', async ({ page }) => {
    const payload = await getPayload({ config })
    const token = await payload.forgotPassword({
      collection: 'users',
      data: { email: testUser.email },
      disableEmail: true,
    })
    await page.goto(`${BASE}/admin/nova-senha/${token}`)
    await expect(page.getByRole('heading', { name: 'Crie uma senha nova' })).toBeVisible()
    await expect(page.locator('.gp-pwrules li svg path')).toHaveCount(0)
    await expect(page.locator('#np-why')).toHaveText('Crie uma senha para continuar.')

    for (const id of ['#pw-new', '#pw-confirm']) {
      const field = page.locator(id)
      await expect(field).toHaveAttribute('type', 'password')
      await page.locator(`${id} + .gp-pwinput__toggle`).click()
      await expect(field).toHaveAttribute('type', 'text')
      await expect(field).toHaveAttribute('autocomplete', 'new-password')
    }

    await page.fill('#pw-new', 'abc')
    await expect(page.locator('#np-why')).toHaveText('Siga as regras da senha acima.')
  })

  test('sem acesso, página não encontrada e fim da sessão', async ({ page }) => {
    await login({ page, user: testUser })

    await page.goto(`${BASE}/admin/unauthorized`)
    await expect(
      page.getByRole('heading', { name: 'Você não tem acesso a esta parte' }),
    ).toBeVisible()
    const home = page.getByRole('link', { name: 'Ir para o início do painel' })
    expect((await home.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
    await expect(page.locator('body')).not.toContainText(/log out|requisição/i)

    await page.goto(`${BASE}/admin/rota-que-nao-existe`)
    await expect(page.getByRole('heading', { name: 'Esta página não existe' })).toBeVisible()
    const back = page.getByRole('link', { name: 'Voltar para o início' })
    expect((await back.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)

    const loggedOut = page.waitForResponse((response) => response.url().includes('/users/logout'))
    await page.goto(`${BASE}/admin/logout-inactivity?redirect=%2Fadmin%2Fpaginas`)
    await expect(page.getByRole('heading', { name: 'Você saiu por segurança' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Entrar de novo' })).toHaveAttribute(
      'href',
      '/admin/login?redirect=%2Fadmin%2Fpaginas',
    )
    // A tela também faz a saída: depois dela, o painel volta a pedir o login.
    await loggedOut
    await page.goto(`${BASE}/admin`)
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
