/** Até duas letras do nome do site, sem acento: "Café Grão Mineiro" vira "CM". */
export function siteInitials(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  if (!words.length) return '?'
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)
  return letters.toUpperCase()
}
