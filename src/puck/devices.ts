import type { PuckPageData, SectionDevices } from './schema'

// "Onde aparece" (Elementor, E3): o que o Publicar confere nas seções que aparecem só num aparelho.

const DEVICE_NAMES = { desktop: 'computador', mobile: 'celular' } as const
type Device = keyof typeof DEVICE_NAMES

const shows = (devices: SectionDevices | undefined, device: Device) =>
  !devices || devices === 'all' || devices === device

/** Seções que aparecem só num aparelho, na ordem da página (a primeira nunca: o site mostra). */
export function deviceLimitedSections(
  data: PuckPageData,
): { id: string; type: string; devices: 'desktop' | 'mobile' }[] {
  return data.content.slice(1).flatMap((section) => {
    const devices = section.props.devices
    return devices === 'desktop' || devices === 'mobile'
      ? [{ id: String(section.props.id), type: section.type, devices }]
      : []
  })
}

/** Em qual aparelho o destino some enquanto o link aparece (ou `null`, se em nenhum). */
export function hiddenWhereLinkShows(
  from: SectionDevices | undefined,
  to: SectionDevices | undefined,
): 'computador' | 'celular' | null {
  for (const device of ['mobile', 'desktop'] as const) {
    if (shows(from, device) && !shows(to, device)) return DEVICE_NAMES[device]
  }
  return null
}

/**
 * Botões e links da página que levam para uma seção desta mesma página escondida no aparelho em
 * que o botão aparece: lá, o visitante toca e fica no topo da página.
 */
export function linksToDeviceHidden(
  data: PuckPageData,
  pageId: number,
): { sectionId: string; sectionType: string; label: string; device: string }[] {
  const devicesOf = new Map<string, SectionDevices | undefined>(
    data.content.map((section, index) => [
      String(section.props.id),
      index === 0 ? 'all' : section.props.devices,
    ]),
  )
  const found: { sectionId: string; sectionType: string; label: string; device: string }[] = []
  data.content.forEach((section, index) => {
    const from = index === 0 ? 'all' : section.props.devices
    const walk = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(walk)
      if (!value || typeof value !== 'object') return
      const record = value as Record<string, unknown>
      const link = record.link as
        { kind?: string; pageId?: unknown; sectionId?: unknown } | null | undefined
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      if (
        label &&
        link?.kind === 'section' &&
        link.pageId === pageId &&
        typeof link.sectionId === 'string' &&
        devicesOf.has(link.sectionId)
      ) {
        const device = hiddenWhereLinkShows(from, devicesOf.get(link.sectionId))
        if (device) {
          found.push({
            sectionId: String(section.props.id),
            sectionType: section.type,
            label,
            device,
          })
        }
      }
      Object.values(record).forEach(walk)
    }
    walk(section.props)
  })
  return found
}

/** Itens do menu (aparecem nos dois aparelhos) que levam a uma seção escondida num deles. */
export function menuToDeviceHidden(
  data: PuckPageData,
  pageId: number,
  items: {
    label?: string | null
    link?: { kind?: string | null; page?: unknown; section?: string | null } | null
  }[],
): { label: string; device: string }[] {
  const limited = new Map(
    deviceLimitedSections(data).map((section) => [section.id, section.devices]),
  )
  return items.flatMap((item) => {
    const link = item.link
    const page =
      typeof link?.page === 'object' && link.page ? (link.page as { id?: unknown }).id : link?.page
    if (link?.kind !== 'section' || page !== pageId || !link.section) return []
    const devices = limited.get(link.section)
    if (!devices) return []
    return [
      {
        label: (item.label ?? '').trim() || 'Item do menu',
        device: DEVICE_NAMES[devices === 'desktop' ? 'mobile' : 'desktop'],
      },
    ]
  })
}
