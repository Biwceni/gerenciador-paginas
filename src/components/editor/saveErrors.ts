import type { Field, Fields } from '@puckeditor/core'
import type { z } from 'zod'

import { PIECE_LABELS, SECTION_LABELS } from '@/puck/config'
import type { PuckPageData } from '@/puck/schema'

import { ROOT_ZONE } from './puck'

/** Onde está o problema: a seção (ou a peça, dentro de uma coluna) e o campo dela. */
export type SaveTarget = {
  zone: string
  index: number
  /** Id da seção ou da peça, para rolar a prévia até ela. */
  id: string
  /** Nome do campo no Puck: "title", "items[2].title". Vazio quando é a seção inteira. */
  field: string
}

export type SaveProblem = { message: string; target?: SaveTarget }

const numbers = new Intl.NumberFormat('pt-BR')

const labelOf = (type: string) =>
  (SECTION_LABELS as Record<string, string>)[type] ??
  (PIECE_LABELS as Record<string, string>)[type] ??
  'Seção'

/** Campos de cada seção ou peça, como o Puck os tem (o `fields` de cada componente). */
export type FieldsByType = Record<string, { fields?: Fields } | undefined>

/** Nome que a pessoa vê no painel para o campo `name` ("items[2].title" → "Título"). */
export function fieldLabel(components: FieldsByType, type: string, name: string): string | null {
  let fields: Fields | undefined = components[type]?.fields
  let label: string | null = null
  for (const part of name.split('.')) {
    const field: Field | undefined = fields?.[part.replace(/\[\d+\]/g, '')]
    if (!field) return label
    label = field.label?.replace(/\s*\(.*\)\s*$/, '') ?? label
    fields =
      field.type === 'array'
        ? (field.arrayFields as Fields)
        : field.type === 'object'
          ? (field.objectFields as Fields)
          : undefined
  }
  return label
}

/** Caminho do Puck ("items[2].title") a partir do caminho do formato (["items", 2, "title"]). */
function puckName(path: PropertyKey[]): string {
  return path
    .map((part, at) => (typeof part === 'number' ? `[${part}]` : `${at ? '.' : ''}${String(part)}`))
    .join('')
}

const ordinal = (n: number) => `${n}ª`

/**
 * Explica em português o primeiro problema que impede de salvar e diz onde ele está, para o
 * editor oferecer "Ir até o campo". `data` é o que está na tela.
 */
export function describeSaveError(
  error: z.ZodError,
  data: PuckPageData,
  components: FieldsByType,
): SaveProblem {
  const issue = error.issues[0]
  if (!issue) return { message: 'Algo na página ficou num formato que não dá para salvar.' }
  // O formato confere `{ version, data }`: o caminho começa em data.content.
  const path = issue.path[0] === 'data' ? issue.path.slice(1) : issue.path
  if (path[0] !== 'content') {
    return {
      message: 'Algo na página ficou num formato que não dá para salvar. Desfaça a última mudança.',
    }
  }

  if (path.length === 1 && issue.code === 'too_big') {
    return {
      message: `A página passou de ${issue.maximum} seções. Remova uma para salvar.`,
    }
  }

  const sectionIndex = Number(path[1])
  const section = data.content[sectionIndex]
  if (!section) return { message: 'Algo na página ficou num formato que não dá para salvar.' }
  let zone = ROOT_ZONE
  let index = sectionIndex
  let type: string = section.type
  let id = String(section.props.id)
  let rest = path.slice(3)
  const where = [labelOf(section.type)]

  // Dentro das Colunas: o problema é numa peça (column1[2].props...) ou na coluna inteira.
  const slot = typeof rest[0] === 'string' ? /^column([123])$/.exec(rest[0]) : null
  if (section.type === 'Columns' && slot) {
    const column = `Coluna ${slot[1]}`
    if (rest.length === 1) {
      const message =
        issue.code === 'too_big'
          ? `A ${column} das ${labelOf('Columns')} passou de ${issue.maximum} peças. Tire uma para salvar.`
          : `A ${column} das ${labelOf('Columns')} ficou num formato que não dá para salvar.`
      return { message, target: { zone, index, id, field: '' } }
    }
    const pieces = (section.props as Record<string, unknown>)[rest[0] as string]
    const piece = Array.isArray(pieces) ? pieces[Number(rest[1])] : undefined
    if (piece && typeof piece === 'object') {
      zone = `${id}:${rest[0] as string}`
      index = Number(rest[1])
      type = String((piece as { type: unknown }).type)
      id = String((piece as { props: { id: unknown } }).props.id)
      where.unshift(`${labelOf(type)} (${ordinal(index + 1)} peça da ${column})`)
      rest = rest.slice(3)
    }
  }

  const field = puckName(rest)
  const label = field ? fieldLabel(components, type, field) : null
  const named = label ? `"${label}"` : 'Um texto'
  const place = `em ${where.join(', em ')}`
  const target: SaveTarget = { zone, index, id, field }

  if (issue.code === 'too_big' && issue.origin === 'string') {
    return {
      message: `${named} ${place} passou do limite de ${numbers.format(Number(issue.maximum))} letras. Encurte para salvar.`,
      target,
    }
  }
  if (issue.code === 'custom' && /letras/.test(issue.message)) {
    return { message: `${named} ${place}: ${issue.message} Encurte para salvar.`, target }
  }
  if (issue.code === 'too_big' && issue.origin === 'array') {
    return {
      message: `${named} ${place} passou do máximo de ${issue.maximum} itens. Remova um para salvar.`,
      target,
    }
  }
  if (issue.code === 'too_small' && issue.origin === 'array') {
    return {
      message: `${named} ${place} ficou sem nenhum item. Coloque pelo menos um para salvar.`,
      target,
    }
  }
  return {
    message: `${named} ${place} ficou num formato que não dá para salvar. Desfaça a última mudança.`,
    target,
  }
}
