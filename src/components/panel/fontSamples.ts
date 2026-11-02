'use client'

import { useEffect, useState } from 'react'

import { normalizeFontName } from '@/lib/style-presets'
import { FONT_NAME_PATTERN } from '@/lib/theme'

// Amostras de fonte da tela Configurações: só ali o painel pede fontes ao Google, e só as letras
// da amostra (`text=`), para ficar leve. O site nunca usa estes arquivos: as fontes dele são
// copiadas para o nosso Storage ao publicar.

const CSS_API = 'https://fonts.googleapis.com/css2'

/** Endereço do CSS do Google com as famílias pedidas, só com as letras de `text`. */
export function googleFontsURL(families: string[], text?: string): string {
  const params = [...new Set(families)].map(
    (name) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}`,
  )
  if (text) params.push(`text=${encodeURIComponent([...new Set(text)].join(''))}`)
  return `${CSS_API}?${params.join('&')}&display=swap`
}

/** Pilha de fontes para o `style`: a escolhida e, se ela não carregar, a do painel. */
export const fontStack = (name: string) => `'${name}', var(--font-body), sans-serif`

export type FontSample = 'empty' | 'loading' | 'found' | 'missing'

/**
 * Procura a fonte digitada no Google e, se achar, deixa ela pronta para a amostra. "missing" quando
 * o Google não tem a fonte (ele responde 400) ou o nome não é de fonte.
 */
export function useFontSample(rawName: string, text: string): FontSample {
  const name = rawName.trim() ? normalizeFontName(rawName) : ''
  const [result, setResult] = useState<{ key: string; state: FontSample }>({
    key: '',
    state: 'empty',
  })
  const key = `${name}\n${text}`

  useEffect(() => {
    if (!name || !FONT_NAME_PATTERN.test(name)) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(googleFontsURL([name], text), { signal: controller.signal })
        if (!response.ok) return setResult({ key, state: 'missing' })
        const style = document.createElement('style')
        style.dataset.gpFontSample = name
        style.textContent = await response.text()
        document.head.appendChild(style)
        await document.fonts.load(`16px '${name}'`, text).catch(() => undefined)
        setResult({ key, state: 'found' })
      } catch {
        // Sem internet ou cancelado: sem amostra, sem aviso (o aviso vem ao salvar).
      }
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [key, name, text])

  if (!name) return 'empty'
  if (!FONT_NAME_PATTERN.test(name)) return 'missing'
  return result.key === key ? result.state : 'loading'
}
