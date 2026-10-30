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
