import sanitizeHtml from 'sanitize-html'

import { linkKind } from './links'

// O campo de texto rico do Puck guarda HTML, e o Puck o desenha sem filtro. Por isso o HTML passa
// por aqui ao salvar e ao ler: só sobram as marcações da lista e, nos links, endereços seguros.
const ALLOWED_TAGS = ['p', 'br', 'h3', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a']

const REMOVED = 'removido'

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    // `target` e `rel` só existem porque o `transformTags` abaixo os coloca (ele troca todos os
    // atributos do link); os que vêm no HTML são descartados ali.
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    // Marcação fora da lista some e o texto dela fica.
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs): sanitizeHtml.Tag => {
        const href = attribs.href?.trim() ?? ''
        const kind = linkKind(href)
        // Endereço inseguro ou caminho que leva para fora (a mesma regra do `SiteLink`): só o texto.
        if (!kind) return { tagName: REMOVED, attribs: {} }
        return {
          tagName,
          attribs:
            kind === 'external' ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href },
        }
      },
    },
  })
}

/** Texto corrido do HTML, para a descrição automática no Google. */
export function richTextToPlain(html: string): string {
  const text = sanitizeHtml(html.replace(/<\/(p|h3|li)>|<br\s*\/?>/gi, ' '), {
    allowedTags: [],
    allowedAttributes: {},
  })
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
