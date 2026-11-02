'use client'

import { useEffect, useRef, useState } from 'react'

import { normalizeFontName } from '@/lib/style-presets'
import { FONT_NAME_PATTERN } from '@/lib/theme'

// Amostras de fonte da tela Configurações: só ali o painel pede fontes ao Google (nos atalhos, só
// as letras deles, com `text=`, para ficar leve). O site nunca usa estes arquivos: as fontes dele
// são copiadas para o nosso Storage ao publicar.

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
 *
 * O pedido é só pelo nome (mudar a frase da amostra não pede de novo), e cada campo usa um `<style>`
 * só, trocado a cada fonte nova e tirado ao sair da tela.
 */
export function useFontSample(rawName: string): FontSample {
  const name = rawName.trim() ? normalizeFontName(rawName) : ''
  const [result, setResult] = useState<{ name: string; state: FontSample }>({
    name: '',
    state: 'empty',
  })
  const style = useRef<HTMLStyleElement | null>(null)

  useEffect(
    () => () => {
      style.current?.remove()
      style.current = null
    },
    [],
  )

  useEffect(() => {
    if (!name || !FONT_NAME_PATTERN.test(name)) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(googleFontsURL([name]), { signal: controller.signal })
        if (!response.ok) return setResult({ name, state: 'missing' })
        const css = await response.text()
        if (!style.current) {
          style.current = document.createElement('style')
          document.head.appendChild(style.current)
        }
        style.current.dataset.gpFontSample = name
        style.current.textContent = css
        await document.fonts.load(`16px '${name}'`).catch(() => undefined)
        setResult({ name, state: 'found' })
      } catch {
        // Sem internet ou cancelado: sem amostra, sem aviso (o aviso vem ao salvar).
      }
    }, 400)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [name])

  if (!name) return 'empty'
  if (!FONT_NAME_PATTERN.test(name)) return 'missing'
  return result.name === name ? result.state : 'loading'
}
