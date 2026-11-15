import type { Page } from '@playwright/test'

/** Abas do painel de opções da seção (componentes, A2). */
export type FieldTabLabel = 'Conteúdo' | 'Aparência' | 'Animação'

/**
 * Abre uma aba do painel de opções da seção escolhida. Seção sem abas (as peças das Colunas)
 * mostra todos os campos: aí não há o que clicar.
 */
export async function openFieldTab(page: Page, label: FieldTabLabel): Promise<void> {
  const tab = page.getByRole('tab', { name: label, exact: true })
  if ((await tab.count()) === 0) return
  await tab.first().click()
}
