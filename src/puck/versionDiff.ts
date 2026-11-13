import { PIECE_LABELS, SECTION_LABELS } from './config'

type Item = { type: string; props: Record<string, unknown> }
type PageData = { content: Item[] }

const LABELS: Record<string, string> = { ...SECTION_LABELS, ...PIECE_LABELS }
const label = (item: Item) => LABELS[item.type] ?? item.type

/**
 * O que mudou de uma versão publicada para a anterior, em poucas palavras (achado 10.5): antes as
 * versões só se diferenciavam pela hora. Ex.: "Entrou: Galeria. Mudou: Banner principal."
 * `older` vazio: a primeira versão.
 */
export function versionChanges(newer: PageData, older: PageData | null): string {
  if (!older) return 'Primeira versão publicada.'
  const before = new Map(older.content.map((item) => [String(item.props.id), item]))
  const after = new Map(newer.content.map((item) => [String(item.props.id), item]))
  const added = newer.content.filter((item) => !before.has(String(item.props.id)))
  const removed = older.content.filter((item) => !after.has(String(item.props.id)))
  const changed = newer.content.filter((item) => {
    const old = before.get(String(item.props.id))
    return old && JSON.stringify(old.props) !== JSON.stringify(item.props)
  })
  const kept = (list: Item[]) =>
    list.map((item) => String(item.props.id)).filter((id) => before.has(id) && after.has(id))
  const moved = kept(older.content).join() !== kept(newer.content).join()

  const names = (list: Item[]) => {
    const unique = [...new Set(list.map(label))]
    return unique.length > 3
      ? `${unique.slice(0, 3).join(', ')} e mais ${unique.length - 3}`
      : unique.join(', ')
  }
  const parts = [
    added.length ? `Entrou: ${names(added)}.` : '',
    removed.length ? `Saiu: ${names(removed)}.` : '',
    changed.length ? `Mudou: ${names(changed)}.` : '',
    moved ? 'A ordem das seções mudou.' : '',
  ].filter(Boolean)
  return parts.join(' ') || 'Só o nome, o endereço ou o Google mudaram.'
}
