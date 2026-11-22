import type { ExampleHit } from '@/lib/examples'
import { editorConfig } from '@/puck/editor-config'

type AnyField = {
  type?: string
  label?: string
  arrayFields?: Record<string, AnyField>
  objectFields?: Record<string, AnyField>
}

/** Nome do campo quando o painel não tem um rótulo para ele (peças das Colunas, por exemplo). */
const KEY_NAMES: Record<string, string> = {
  title: 'título',
  text: 'texto',
  quote: 'depoimento',
  name: 'nome',
  question: 'pergunta',
  answer: 'resposta',
  caption: 'legenda',
  description: 'descrição',
  body: 'texto',
}

/** "Título (opcional)" vira "título": no lugar, só o nome do campo. */
const fieldName = (label: string) =>
  label
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toLowerCase())

/**
 * Onde está o texto de exemplo, em palavras (A7): "Perguntas frequentes › resposta 2". O nome da
 * seção vem do catálogo, e o do campo, do rótulo que o painel mostra.
 */
export function examplePlace(hit: Pick<ExampleHit, 'sectionType' | 'path'>): string {
  const component = (
    editorConfig.components as Record<string, { label?: string; fields?: Record<string, AnyField> }>
  )[hit.sectionType]
  const section = component?.label ?? hit.sectionType
  let fields: Record<string, AnyField> | undefined = component?.fields
  let name: string | null = null
  let index: number | null = null
  for (const step of hit.path) {
    if (typeof step === 'number') {
      index = step
      continue
    }
    const field: AnyField | undefined = fields?.[step]
    name = field?.label ? fieldName(field.label) : (KEY_NAMES[step] ?? name)
    fields = field?.arrayFields ?? field?.objectFields
  }
  if (!name) return section
  return `${section} › ${name}${index !== null ? ` ${index + 1}` : ''}`
}
