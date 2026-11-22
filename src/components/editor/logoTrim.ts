import { findTrim, type Trim } from '@/lib/logos'
import type { Media } from '@/payload-types'

import { thumbnailURL } from './context'

/**
 * Mede a sobra em volta de um logo (C5), pela miniatura (a mesma proporção da foto, até 400 px):
 * desenha num quadro pequeno e procura onde o desenho começa e termina (`findTrim`). Se a foto não
 * puder ser lida (outro servidor sem permissão, demora), o logo entra inteiro.
 */
export function measureTrim(photo: Media, timeout = 4000): Promise<Trim | undefined> {
  const url = thumbnailURL(photo)
  if (!url || typeof document === 'undefined') return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const image = new Image()
    const timer = window.setTimeout(() => resolve(undefined), timeout)
    const done = (trim: Trim | undefined) => {
      window.clearTimeout(timer)
      resolve(trim)
    }
    image.crossOrigin = 'anonymous'
    image.onerror = () => done(undefined)
    image.onload = () => {
      try {
        const scale = Math.min(1, 240 / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return done(undefined)
        context.drawImage(image, 0, 0, width, height)
        const trim = findTrim(context.getImageData(0, 0, width, height).data, width, height)
        done(trim ?? undefined)
      } catch {
        done(undefined)
      }
    }
    image.src = url
  })
}
