import { expect, test } from '@playwright/test'

// O aviso é o `.gp-warnbox`: o anúncio de rota do Next também tem `role="alert"`.

import { WRONG_LOGIN_MESSAGE } from '../../src/lib/auth'
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
})
