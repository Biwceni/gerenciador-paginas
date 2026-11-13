import type { z } from 'zod'

import { LIMITS } from './limits'
import { columnPieceSchema, componentSchema } from './schema'

/**
 * Limite de letras de um campo do editor, tirado do próprio formato (`schema.ts`): o contador do
 * painel e a regra que decide se a página salva nunca ficam diferentes.
 */

type AnySchema = z.ZodType & { _zod: { def: Record<string, unknown> & { type: string } } }

const propsByType: Record<string, AnySchema> = Object.fromEntries(
  [...componentSchema.options, ...columnPieceSchema.options].map((option) => [
    option.shape.type.value,
    option.shape.props as unknown as AnySchema,
  ]),
)

/** Tira as camadas que não mudam o tipo do valor: opcional, nulo, padrão, conversão. */
function unwrap(schema: AnySchema): AnySchema {
  let current = schema
  for (let i = 0; i < 10; i++) {
    const def = current._zod.def
    if (['optional', 'nullable', 'default', 'catch', 'readonly'].includes(def.type)) {
      current = def.innerType as AnySchema
    } else if (def.type === 'pipe') {
      current = def.in as AnySchema
    } else break
  }
  return current
}

/** Texto com marcações (Texto simples): o limite conta só as letras que aparecem. */
export function countsVisibleLetters(type: string | undefined, name: string): boolean {
  return type === 'RichText' && name === 'body'
}

/**
 * Máximo de letras do campo `name` ("title", "items[2].title", "button.label") na seção ou peça
 * `type`. Sem limite (ou campo desconhecido): `null`.
 */
export function fieldLimit(type: string | undefined, name: string): number | null {
  if (!type) return null
  if (countsVisibleLetters(type, name)) return LIMITS.richTextLetters
  let schema: AnySchema | undefined = propsByType[type]
  for (const part of name.split('.')) {
    const match = /^(\w+)((?:\[\d+\])*)$/.exec(part)
    if (!match || !schema) return null
    const object = unwrap(schema)
    if (object._zod.def.type !== 'object') return null
    schema = (object._zod.def.shape as Record<string, AnySchema>)[match[1]]
    for (let depth = match[2].split('[').length - 1; depth > 0 && schema; depth--) {
      const array = unwrap(schema)
      schema = array._zod.def.type === 'array' ? (array._zod.def.element as AnySchema) : undefined
    }
  }
  if (!schema) return null
  const leaf = unwrap(schema) as AnySchema & { maxLength?: number | null }
  return leaf._zod.def.type === 'string' && typeof leaf.maxLength === 'number'
    ? leaf.maxLength
    : null
}
