import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Entra no painel pela tela de entrar nossa (v2).
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`)

  await page.fill('#lg-email', user.email)
  await page.fill('#lg-pass', user.password)
  await page.click('button[type="submit"]')

  await page.waitForURL(`${serverURL}/admin**`)

  // O servidor de desenvolvimento compila o painel na primeira vez que ele abre.
  await expect(page.getByRole('navigation', { name: 'Menu do painel' })).toBeVisible({
    timeout: 90_000,
  })
}
