import { extractLogoColors, LOGO_SAMPLE_SIZE, type LogoColor } from '@/lib/brand'

/**
 * Lê as cores do logo aqui mesmo, no navegador: a foto já está na nossa biblioteca, é desenhada num
 * canvas de 48 × 48 e os pixels vão para a conta de `lib/brand.ts`. Nenhum serviço de fora recebe
 * nada. Devolve `null` quando a imagem não abre ou o navegador não deixa ler os pixels.
 */
export function readLogoColors(url: string): Promise<LogoColor[] | null> {
  return new Promise((resolve) => {
    const image = new Image()
    // A biblioteca fica no Storage (outro endereço): sem isto, o canvas não deixa ler os pixels.
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = LOGO_SAMPLE_SIZE
        canvas.height = LOGO_SAMPLE_SIZE
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) return resolve(null)
        context.drawImage(image, 0, 0, LOGO_SAMPLE_SIZE, LOGO_SAMPLE_SIZE)
        const { data } = context.getImageData(0, 0, LOGO_SAMPLE_SIZE, LOGO_SAMPLE_SIZE)
        resolve(extractLogoColors(data))
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    // Endereço um pouco diferente do da miniatura na tela: a cópia guardada pelo navegador veio sem
    // a permissão de leitura e travaria o canvas.
    image.src = `${url}${url.includes('?') ? '&' : '?'}leitura=cores`
  })
}
