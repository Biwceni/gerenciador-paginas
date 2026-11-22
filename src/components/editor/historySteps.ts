import { editorConfig } from '@/puck/editor-config'
import { PIECE_LABELS, SECTION_LABELS } from '@/puck/config'

type Item = { type: string; props: Record<string, unknown> }
type PageData = { root?: { props?: Record<string, unknown> }; content: Item[] }

/** Quantos passos a lista "Mudanças de agora" mostra (extra do A5, como o Histórico do Elementor). */
export const HISTORY_SHOWN = 30

const LABELS: Record<string, string> = { ...SECTION_LABELS, ...PIECE_LABELS }
const label = (item: Item) => LABELS[item.type] ?? item.type

/** O rótulo de um campo da seção, sem o "(opcional)", em minúsculas: "título", "fotos da galeria". */
function fieldLabel(type: string, key: string): string | null {
  const fields = (
    editorConfig.components as Record<string, { fields?: Record<string, { label?: string }> }>
  )[type]?.fields
  const raw = fields?.[key]?.label
  if (!raw) return null
  return raw
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toLowerCase())
}

/**
 * O que um passo do Desfazer mudou, em poucas palavras: "Entrou: Galeria", "Mudou em Banner
 * principal: título". `null`: o passo não mudou o conteúdo (só a tela).
 */
export function describeStep(newer: PageData, older: PageData): string | null {
  const before = new Map(older.content.map((item) => [String(item.props.id), item]))
  const after = new Map(newer.content.map((item) => [String(item.props.id), item]))
  const added = newer.content.filter((item) => !before.has(String(item.props.id)))
  const removed = older.content.filter((item) => !after.has(String(item.props.id)))
  if (added.length === 1 && !removed.length) return `Entrou: ${label(added[0])}`
  if (added.length > 1 && !removed.length) return `Entraram ${added.length} seções`
  if (removed.length === 1 && !added.length) return `Saiu: ${label(removed[0])}`
  if (removed.length > 1 && !added.length) return `Saíram ${removed.length} seções`
  if (added.length || removed.length) return 'Seções trocadas'

  const kept = (list: Item[]) => list.map((item) => String(item.props.id))
  if (kept(older.content).join() !== kept(newer.content).join()) {
    return 'Mudou a ordem das seções'
  }

  const changed = newer.content.filter((item) => {
    const old = before.get(String(item.props.id))
    return old && JSON.stringify(old.props) !== JSON.stringify(item.props)
  })
  if (changed.length === 1) {
    const item = changed[0]
    const old = before.get(String(item.props.id))?.props ?? {}
    const keys = Object.keys({ ...old, ...item.props }).filter(
      (key) => JSON.stringify(old[key]) !== JSON.stringify(item.props[key]),
    )
    const names = [
      ...new Set(keys.map((key) => fieldLabel(item.type, key)).filter(Boolean)),
    ] as string[]
    return names.length && names.length <= 2
      ? `Mudou em ${label(item)}: ${names.join(' e ')}`
      : `Mudou: ${label(item)}`
  }
  if (changed.length > 1) return `Mudaram ${changed.length} seções`

  if (JSON.stringify(older.root?.props ?? {}) !== JSON.stringify(newer.root?.props ?? {})) {
    return 'Um texto de exemplo ficou como está'
  }
  return null
}
