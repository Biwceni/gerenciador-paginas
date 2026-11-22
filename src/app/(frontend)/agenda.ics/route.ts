import { icsFile } from '@/lib/events'
import { LIMITS } from '@/puck/limits'

// "Adicionar à agenda" (B5): o arquivo .ics de uma data da Agenda, que o celular abre na agenda
// dele (no iPhone, o Safari mostra "Adicionar"; no Android, abre o app de agenda). Tudo vem no endereço (`icsHref`), com os mesmos limites da seção: nada é lido do banco.

const field = (params: URLSearchParams, key: string, max: number) =>
  (params.get(key) ?? '').slice(0, max)

export function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const event = {
    date: field(params, 'd', 10),
    time: field(params, 'h', 5),
    title: field(params, 't', LIMITS.eventTitle),
    place: field(params, 'l', LIMITS.eventPlace),
    text: field(params, 'x', LIMITS.eventText),
  }
  const uid = `${event.date}-${event.time || 'dia'}-${encodeURIComponent(event.title).slice(0, 60)}@agenda`
  const file = icsFile(event, new Date(), uid)
  if (!file) return new Response('Data inválida.', { status: 400 })
  return new Response(file, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="data.ics"',
      'Cache-Control': 'public, max-age=86400',
      'X-Robots-Tag': 'noindex',
    },
  })
}
