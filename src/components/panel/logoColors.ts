import {
  borderColor,
  extractLogoColors,
  LOGO_SAMPLE_SIZE,
  type LogoColor,
  removeConnected,
} from '@/lib/brand'

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

/** Lado maior em que o logo é desenhado para tirar o fundo: basta para o topo e o rodapé. */
const CUTOUT_SIZE = 800

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = `${url}${url.includes('?') ? '&' : '?'}leitura=fundo`
  })
}

function drawn(image: HTMLImageElement, max: number) {
  const scale = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.drawImage(image, 0, 0, width, height)
  return { canvas, context, width, height }
}

/**
 * O logo tem um fundo de uma cor só (E2)? Lê a borda da imagem: se quase toda ela é opaca e da mesma
 * cor, devolve essa cor. Fundo transparente, foto ou degradê devolvem `null` (tirar o fundo só vale
 * para fundo de uma cor).
 */
export async function solidBackground(url: string): Promise<string | null> {
  const image = await loadImage(url)
  if (!image) return null
  try {
    const result = drawn(image, 200)
    if (!result) return null
    const { data } = result.context.getImageData(0, 0, result.width, result.height)
    return borderColor(data, result.width, result.height)
  } catch {
    return null
  }
}

/**
 * Tira o fundo de uma cor só: os pixels dessa cor ligados à borda ficam transparentes (o miolo de um
 * "O" branco num logo de fundo branco continua, se não toca a borda). A beirada fica suave. Devolve
 * um PNG, ou `null` se não der.
 */
export async function cutOutBackground(url: string, color: string): Promise<Blob | null> {
  const image = await loadImage(url)
  if (!image) return null
  try {
    const result = drawn(image, CUTOUT_SIZE)
    if (!result) return null
    const { canvas, context, width, height } = result
    const pixels = context.getImageData(0, 0, width, height)
    removeConnected(pixels.data, width, height, color)
    context.putImageData(pixels, 0, 0)
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  } catch {
    return null
  }
}
