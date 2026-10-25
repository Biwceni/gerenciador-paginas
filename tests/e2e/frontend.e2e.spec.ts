import { test, expect } from '@playwright/test'

// O banco de testes começa vazio: sem página inicial publicada, o início mostra um aviso, não 404.
test.describe('Frontend', () => {
  test('início abre mesmo sem página inicial', async ({ page }) => {
    const response = await page.goto('http://localhost:3000')

    expect(response?.status()).toBe(200)
    await expect(page.locator('h1').first()).toHaveText('Site em preparação')
  })

  test('endereço que não existe mostra a página de erro do site', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/nao-existe')

    expect(response?.status()).toBe(404)
    await expect(page.locator('h1').first()).toHaveText('Página não encontrada')
    await expect(page.getByRole('link', { name: 'Ir para o início' })).toBeVisible()
  })
})
