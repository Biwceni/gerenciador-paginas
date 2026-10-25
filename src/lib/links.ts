// Só endereços que o navegador abre com segurança: `javascript:` e parecidos rodariam código no site.
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

export function isSafeURL(value: string): boolean {
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol)
  } catch {
    return false
  }
}

/** Para campos de endereço externo: mensagem para o usuário, ou `true` quando serve. */
export function validateExternalURL(value: string | null | undefined): string | true {
  if (!value) return 'Digite o endereço do link.'
  if (!isSafeURL(value)) {
    return 'Digite o endereço completo, começando com https://. Ex.: https://instagram.com/seusite'
  }
  return true
}

/**
 * Número de WhatsApp só com dígitos e com o código do Brasil (55).
 * Aceita "(31) 99999-0000", "31999990000" ou "+55 31 99999-0000". Devolve `null` se não parecer um número.
 */
export function normalizeWhatsApp(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits
  return null
}

export function whatsAppURL(value: string | null | undefined): string | null {
  const number = normalizeWhatsApp(value)
  return number ? `https://wa.me/${number}` : null
}

const INSTAGRAM_HANDLE = /^@?([A-Za-z0-9._]{1,30})$/

/** Aceita "@perfil", "perfil" ou o endereço completo do perfil. */
export function validateInstagram(value: string | null | undefined): string | true {
  if (!value || INSTAGRAM_HANDLE.test(value.trim()) || isSafeURL(value)) return true
  return 'Digite o perfil, como @seunegocio, ou o endereço completo.'
}

/** Endereço e texto do Instagram para o site, a partir do que o cliente digitou. */
export function instagramLink(
  value: string | null | undefined,
): { url: string; label: string } | null {
  const trimmed = (value ?? '').trim()
  const handle = INSTAGRAM_HANDLE.exec(trimmed)?.[1]
  if (handle) return { url: `https://instagram.com/${handle}`, label: `@${handle}` }
  if (trimmed && isSafeURL(trimmed)) {
    const path = new URL(trimmed).pathname.split('/').filter(Boolean)[0]
    return { url: trimmed, label: path ? `@${path}` : trimmed }
  }
  return null
}

// Página do site: começa com uma barra só e não tem barra invertida nem espaço. O navegador trata
// "\" como "/" e descarta tabulação e quebra de linha, então "//outro-site.com",
// "/\outro-site.com" e "/<tab>/outro-site.com" levariam para fora.
const INTERNAL_PATH = /^\/(?![/\\])[^\s\\]*$/

/** Como desenhar um endereço: página do site, link de fora ou nada (endereço inseguro). */
export function linkKind(href: string): 'internal' | 'external' | null {
  if (INTERNAL_PATH.test(href)) return 'internal'
  return isSafeURL(href) ? 'external' : null
}
