// Contagem dos "Números do negócio" (Elementor, E10): "+3.000" conta 0, 120, 240… até 3.000,
// guardando o que vem antes e depois do número ("+", "h", "★") e o jeito de escrever (ponto de
// milhar, vírgula decimal).

const NUMBER = /(\d{1,3}(?:\.\d{3})+|\d+)(,\d+)?/

export type CountTarget = {
  before: string
  after: string
  value: number
  decimals: number
  grouped: boolean
}

/** O número de dentro do texto, ou `null` quando não há número para contar ("24 horas" conta). */
export function parseCount(text: string): CountTarget | null {
  const match = NUMBER.exec(text)
  if (!match) return null
  const whole = match[1]
  const fraction = match[2] ?? ''
  const value = Number(`${whole.replace(/\./g, '')}${fraction ? `.${fraction.slice(1)}` : ''}`)
  if (!Number.isFinite(value) || value <= 0) return null
  return {
    before: text.slice(0, match.index),
    after: text.slice(match.index + match[0].length),
    value,
    decimals: fraction ? fraction.length - 1 : 0,
    grouped: whole.includes('.'),
  }
}

/** O texto com o número no meio da contagem (`progress` de 0 a 1). No fim, igual ao original. */
export function countText(target: CountTarget, progress: number): string {
  const current = target.value * Math.min(1, Math.max(0, progress))
  const number = current.toLocaleString('pt-BR', {
    minimumFractionDigits: target.decimals,
    maximumFractionDigits: target.decimals,
    useGrouping: target.grouped,
  })
  return `${target.before}${number}${target.after}`
}

const DURATION = 1400

/**
 * Conta do zero até o número de cada `[data-countup]` dentro de `root`, uma vez. Quem chama já
 * conferiu a animação do site e o pedido de menos movimento.
 */
export function startCountUp(root: Element) {
  const view = root.ownerDocument.defaultView
  if (!view) return
  for (const element of root.querySelectorAll<HTMLElement>('[data-countup]')) {
    const original = element.dataset.countup ?? ''
    const target = parseCount(original)
    if (!target || element.dataset.counted) continue
    element.dataset.counted = '1'
    const start = view.performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      // Começa rápido e chega devagar.
      const eased = 1 - Math.pow(1 - t, 3)
      element.textContent = t >= 1 ? original : countText(target, eased)
      if (t < 1) view.requestAnimationFrame(step)
    }
    element.textContent = countText(target, 0)
    view.requestAnimationFrame(step)
  }
}
