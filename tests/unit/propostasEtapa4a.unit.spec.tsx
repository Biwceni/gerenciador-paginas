import { readFileSync } from 'node:fs'
import path from 'node:path'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  countdownText,
  eventDateParts,
  eventStart,
  eventTimeText,
  icsFile,
  icsHref,
  splitEvents,
  todayInBrazil,
} from '@/lib/events'
import { textsOf } from '@/lib/examples'
import { findTrim, logoBox, logoRatio, trimStyle } from '@/lib/logos'
import { fitTable, looksLikeTable, parseSpreadsheet, pasteAt } from '@/lib/tablePaste'
import type { Media } from '@/payload-types'
import { Events, LogoStrip, Table, Team, teamColumns } from '@/puck/components/sections'
import { SECTION_LABELS } from '@/puck/config'
import { hiddenSections } from '@/puck/hiddenSections'
import type { ContentMetadata } from '@/puck/references'
import {
  CONTENT_VERSION,
  type EventsProps,
  parsePageContent,
  type TableProps,
  type TeamProps,
} from '@/puck/schema'
import { sectionSummary } from '@/puck/sectionSummary'

// Propostas para qualquer negócio (plano de 2026-11-22), etapa 4a: C5 (Tabela, Equipe, Faixa de
// logos, Antes e depois) e B5 (Agenda), com colar da planilha e "Adicionar à agenda".

const siteCss = readFileSync(path.resolve('src/app/(frontend)/styles.css'), 'utf8')

const photo = (id: number, width = 1600, height = 1200) =>
  ({ id, url: `/f${id}.jpg`, width, height, alt: `Foto ${id}` }) as unknown as Media

const metadata: ContentMetadata = {
  photos: { 1: photo(1), 2: photo(2), 3: photo(3, 800, 200), 4: photo(4, 300, 600) },
  forms: {},
  pageHrefs: {},
  pageAnchors: {},
  anchors: {},
  whatsappHref: 'https://wa.me/5531999990000',
  site: { name: 'Loja', logo: null, contact: {} },
  mainHeadingId: 'h',
}

const parse = (content: unknown[]) =>
  parsePageContent({ version: CONTENT_VERSION, data: { root: { props: {} }, content } })
const render = (node: React.ReactElement) => renderToStaticMarkup(node)
const LIMITS = { maxColumns: 8, maxRows: 30, maxCell: 120 }

const tableProps = (head: string[], rows: string[][]): TableProps => ({
  id: 'Ta-1',
  menuLabel: '',
  title: 'Preços',
  text: '',
  head,
  rows,
  style: 'light',
  anim: 'site',
})

describe('Tabela (C5)', () => {
  it('8 colunas e 30 linhas cabem; 9 colunas ou 31 linhas não', () => {
    const row = Array.from({ length: 8 }, (_, i) => `c${i}`)
    const ok = parse([{ type: 'Table', props: tableProps(row, Array(30).fill(row)) }])
    expect(ok.success).toBe(true)
    expect(parse([{ type: 'Table', props: tableProps([...row, 'x'], []) }]).success).toBe(false)
    expect(parse([{ type: 'Table', props: tableProps(row, Array(31).fill(row)) }]).success).toBe(
      false,
    )
  })

  it('cabeçalho de coluna e de linha, número à direita e linha vazia fora no site', () => {
    const html = render(
      <Table
        {...tableProps(
          ['Serviço', 'Tempo', 'Preço'],
          [
            ['Corte', '40 min', 'R$ 50'],
            ['', '', ''],
            ['Barba', '30 min', 'R$ 35,90'],
          ],
        )}
        metadata={metadata}
      />,
    )
    expect(html).toContain('<th scope="col">Serviço</th>')
    expect(html).toContain('<th scope="row">Corte</th>')
    expect(html.match(/<tr>/g)).toHaveLength(3)
    expect(html).toContain('<td data-num="true">R$ 35,90</td>')
    expect(html).toContain('role="region"')
    expect(html).toContain('tabindex="0"')
  })

  it('a primeira coluna fica parada quando a tabela rola para o lado', () => {
    expect(siteCss).toMatch(/\.table :is\(thead th:first-child, tbody th\) \{\s*position: sticky;/)
  })

  it('colar da planilha: tabulação, aspas com quebra de linha e linhas vazias no fim', () => {
    const cells = parseSpreadsheet('A\tB\r\n"linha\ncom ""aspas"""\t2\r\n\r\n')
    expect(cells).toEqual([
      ['A', 'B'],
      ['linha com "aspas"', '2'],
    ])
    expect(looksLikeTable('só uma palavra')).toBe(false)
    expect(looksLikeTable('a\tb')).toBe(true)
  })

  it('planilha maior que a tabela: entram 8 colunas e 30 linhas e avisa o que ficou de fora', () => {
    const big = Array.from({ length: 51 }, (_, r) =>
      Array.from({ length: 12 }, (_, c) => `${r}-${c}`),
    )
    const table = fitTable(big, LIMITS)
    expect(table.head).toHaveLength(8)
    expect(table.rows).toHaveLength(30)
    expect(table.cut).toEqual({ columns: 12, rows: 50 })
    expect(fitTable([['a', 'b'], ['c']], LIMITS)).toMatchObject({ rows: [['c', '']], cut: null })
  })

  it('colar numa caixinha cola a partir dela e aumenta a tabela', () => {
    const next = pasteAt(
      { head: ['A', 'B'], rows: [['1', '2']] },
      [
        ['x', 'y'],
        ['z', 'w'],
      ],
      { row: 0, column: 1 },
      LIMITS,
    )
    expect(next).toEqual({
      head: ['A', 'B', ''],
      rows: [
        ['1', 'x', 'y'],
        ['', 'z', 'w'],
      ],
    })
  })
})

const member = (name: string, extra: Partial<TeamProps['items'][number]> = {}) => ({
  photo: null,
  role: 'Dentista',
  name,
  text: '',
  contact: null,
  ...extra,
})
const teamProps = (items: TeamProps['items']): TeamProps => ({
  id: 'Te-1',
  menuLabel: '',
  title: 'Equipe',
  text: '',
  items,
  style: 'light',
  anim: 'site',
})

describe('Equipe (C5)', () => {
  it('de 1 a 24 pessoas', () => {
    expect(parse([{ type: 'Team', props: teamProps(Array(24).fill(member('A'))) }]).success).toBe(
      true,
    )
    expect(parse([{ type: 'Team', props: teamProps(Array(25).fill(member('A'))) }]).success).toBe(
      false,
    )
  })

  it('cargo em cima do nome, iniciais sem foto e contato com o nome para o leitor de tela', () => {
    const html = render(
      <Team
        {...teamProps([
          member('Ana Clara Souza', {
            contact: { label: '', link: { kind: 'whatsapp' } },
          }),
          member(''),
        ])}
        metadata={metadata}
      />,
    )
    expect(html.indexOf('team__role')).toBeLessThan(html.indexOf('team__name'))
    expect(html).toContain('>AC<')
    expect(html).toContain('Falar comigo<span class="visually-hidden">: Ana Clara Souza</span>')
    // Sem nome não aparece no site.
    expect(html.match(/team__item/g)).toHaveLength(1)
  })

  it('colunas: até 4, com 5 e 6 em 3; no celular 2', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 24].map(teamColumns)).toEqual([1, 2, 3, 4, 3, 3, 4, 4, 4])
    expect(siteCss).toContain('--cols: 2 !important;')
  })
})

describe('Faixa de logos (C5)', () => {
  it('mesma área para formatos diferentes, com tetos de largura e altura', () => {
    const square = logoBox(1)
    const wide = logoBox(4)
    expect(square).toEqual({ width: 60, height: 60 })
    expect(wide.width * wide.height).toBeCloseTo(3600, -2)
    expect(logoBox(20).width).toBe(180)
    expect(logoBox(0.2).height).toBe(72)
  })

  it('a sobra branca ou transparente sai; fundo de cor fica', () => {
    const image = (bg: number[], w = 10, h = 10) => {
      const pixels = new Uint8ClampedArray(w * h * 4)
      for (let i = 0; i < w * h; i++) pixels.set(bg, i * 4)
      // O desenho: de x 2 a 7, y 4 a 5.
      for (let y = 4; y <= 5; y++)
        for (let x = 2; x <= 7; x++) pixels.set([20, 20, 20, 255], (y * w + x) * 4)
      return pixels
    }
    expect(findTrim(image([255, 255, 255, 255]), 10, 10)).toEqual({
      x: 0.18,
      y: 0.38,
      w: 0.64,
      h: 0.24,
    })
    expect(findTrim(image([0, 0, 0, 0]), 10, 10)).toEqual({ x: 0.18, y: 0.38, w: 0.64, h: 0.24 })
    expect(findTrim(image([200, 30, 30, 255]), 10, 10)).toEqual({ x: 0, y: 0, w: 1, h: 1 })
    expect(findTrim(new Uint8ClampedArray(400), 10, 10)).toBeNull()
  })

  it('o recorte vira o tamanho da foto inteira dentro da caixa', () => {
    expect(trimStyle({ x: 0.25, y: 0.5, w: 0.5, h: 0.25 })).toEqual({
      width: '200%',
      height: '400%',
      left: '-50%',
      top: '-200%',
    })
    expect(trimStyle({ x: 0, y: 0, w: 1, h: 1 })).toBeNull()
    expect(logoRatio(800, 200, { x: 0, y: 0, w: 0.5, h: 1 })).toBe(2)
  })

  it('no site: um logo largo baixo e um alto estreito, com a descrição como nome', () => {
    const html = render(
      <LogoStrip
        id="Lo-1"
        images={[{ mediaId: 3 }, { mediaId: 4 }, { mediaId: 99 }]}
        menuLabel=""
        metadata={metadata}
        style="light"
        title="Parceiros"
      />,
    )
    expect(html.match(/logos__item/g)).toHaveLength(2)
    expect(html).toContain('--logo-w:120px;--logo-h:30px')
    expect(html).toContain('alt="Foto 3"')
    expect(siteCss).toContain('mix-blend-mode: multiply')
  })
})

const event = (date: string, title = 'Show', extra: Record<string, unknown> = {}) => ({
  date,
  time: '',
  title,
  place: '',
  text: '',
  button: null,
  ...extra,
})
const eventsProps = (
  items: EventsProps['items'],
  extra: Partial<EventsProps> = {},
): EventsProps => ({
  id: 'Ev-1',
  menuLabel: '',
  title: 'Agenda',
  text: '',
  items,
  style: 'light',
  anim: 'site',
  ...extra,
})

describe('Agenda (B5)', () => {
  const now = new Date('2026-12-10T15:00:00-03:00')

  it('hoje é o dia de Brasília, mesmo de madrugada no horário universal', () => {
    expect(todayInBrazil(new Date('2026-12-11T01:30:00Z'))).toBe('2026-12-10')
    expect(eventStart({ date: '2026-12-10', time: '19:30' })?.toISOString()).toBe(
      '2026-12-10T22:30:00.000Z',
    )
  })

  it('próximos primeiro; os de hoje ainda são próximos; passados do mais recente', () => {
    const items = [
      { date: '2026-12-20', time: '' },
      { date: '2026-12-01', time: '' },
      { date: '2026-12-10', time: '09:00' },
      { date: '', time: '' },
      { date: '2026-11-15', time: '' },
      { date: '2026-12-10', time: '08:00' },
    ]
    expect(splitEvents(items, now)).toEqual({ upcoming: [5, 2, 0], past: [1, 4] })
  })

  it('contagem só em dias e horas', () => {
    expect(countdownText({ date: '2026-12-13', time: '19:00' }, now)).toBe(
      'Faltam 3 dias e 4 horas',
    )
    expect(countdownText({ date: '2026-12-11', time: '16:30' }, now)).toBe('Falta 1 dia e 1 hora')
    expect(countdownText({ date: '2026-12-10', time: '15:40' }, now)).toBe('Falta menos de 1 hora')
    expect(countdownText({ date: '2026-12-10', time: '' }, now)).toBe('É hoje')
    expect(countdownText({ date: '2026-12-10', time: '10:00' }, now)).toBe('Começou')
  })

  it('data em partes e horário como no cartão', () => {
    expect(eventDateParts('2026-12-12')).toMatchObject({ weekday: 'sáb', day: '12', month: 'dez' })
    expect(eventTimeText('19:30')).toBe('19h30')
    expect(eventTimeText('20:00')).toBe('20h')
  })

  it('o arquivo .ics: com horário dura 2 horas; sem horário, o dia todo; texto escapado', () => {
    const timed = icsFile(
      {
        date: '2026-12-12',
        time: '19:30',
        title: 'Show, ao vivo',
        place: 'Teatro; centro',
        text: '',
      },
      now,
      'u1',
    )!
    expect(timed).toContain('DTSTART:20261212T223000Z\r\n')
    expect(timed).toContain('DTEND:20261213T003000Z\r\n')
    expect(timed).toContain('SUMMARY:Show\\, ao vivo')
    expect(timed).toContain('LOCATION:Teatro\\; centro')
    const allDay = icsFile(
      { date: '2026-12-31', time: '', title: 'Réveillon', place: '', text: '' },
      now,
      'u2',
    )!
    expect(allDay).toContain('DTSTART;VALUE=DATE:20261231')
    expect(allDay).toContain('DTEND;VALUE=DATE:20270101')
    expect(icsFile({ date: '', time: '', title: 'x', place: '', text: '' }, now, 'u')).toBeNull()
    expect(icsHref({ date: '2026-12-12', time: '19:30', title: 'Show', place: '', text: '' })).toBe(
      '/agenda.ics?d=2026-12-12&t=Show&h=19%3A30',
    )
  })

  it('até 40 datas; data inválida vira vazia', () => {
    const ok = parse([{ type: 'Events', props: eventsProps(Array(40).fill(event('2026-12-12'))) }])
    expect(ok.success).toBe(true)
    expect(
      parse([{ type: 'Events', props: eventsProps(Array(41).fill(event('2026-12-12'))) }]).success,
    ).toBe(false)
    const bad = parse([{ type: 'Events', props: eventsProps([event('12/12/2026')]) }])
    expect(bad.success && bad.data.data.content[0].props).toMatchObject({ items: [{ date: '' }] })
  })

  it('no site: agenda vazia avisa, sem quebrar a página', () => {
    const html = render(<Events {...eventsProps([event('', 'Nova data')])} metadata={metadata} />)
    expect(html).toContain('Nenhuma data marcada agora')
  })

  it('cada data tem "Adicionar à agenda" e o botão padrão do site', () => {
    const html = render(
      <Events
        {...eventsProps([
          event('2099-05-01', 'Feira', {
            time: '10:00',
            button: { label: 'Inscrição', link: { kind: 'url', url: 'https://example.com' } },
          }),
        ])}
        metadata={metadata}
      />,
    )
    expect(html).toContain('href="/agenda.ics?d=2099-05-01&amp;t=Feira&amp;h=10%3A00"')
    expect(html).toContain('class="button"')
    expect(html).toMatch(/datetime="2099-05-01T10:00-03:00"/i)
  })
})

describe('seções novas no editor e nas regras da página', () => {
  it('entram na lista de seções', () => {
    expect(SECTION_LABELS).toMatchObject({
      Table: 'Tabela',
      Team: 'Equipe',
      LogoStrip: 'Faixa de logos',
      BeforeAfter: 'Antes e depois',
      Events: 'Agenda',
    })
  })

  it('avisam no editor quando não vão aparecer', () => {
    const page = parse([
      { type: 'Table', props: tableProps(['A'], [['']]) },
      { type: 'Team', props: teamProps([member('')]) },
      {
        type: 'LogoStrip',
        props: { id: 'L', menuLabel: '', title: '', images: [], style: 'light', anim: 'site' },
      },
      {
        type: 'BeforeAfter',
        props: {
          id: 'B',
          menuLabel: '',
          title: '',
          text: '',
          items: [{ before: { mediaId: 1 }, after: null, caption: '' }],
          style: 'light',
          anim: 'site',
        },
      },
      { type: 'Events', props: eventsProps([event('', 'Sem dia')]) },
    ])
    if (!page.success) throw new Error('inválida')
    expect(hiddenSections(page.data.data, () => true).map((hidden) => hidden.reason)).toEqual([
      'a tabela está vazia',
      'ninguém tem nome',
      'não tem nenhum logo',
      'nenhum par tem as duas fotos',
      'nenhuma data tem dia e título',
    ])
    expect(sectionSummary(page.data.data.content[4])).toBe('Sem dia')
  })

  it('células da tabela contam como texto de exemplo; o nome das colunas não', () => {
    const texts = textsOf({ head: ['Plano'], rows: [['Básico', 'R$ 90']] })
    expect(texts).toEqual(['básico', 'r$ 90'])
  })
})
