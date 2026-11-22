import { describe, expect, it } from 'vitest'

import {
  bookableDays,
  checkFile,
  checkSubmission,
  dayText,
  FILE_MAX_BYTES,
  type FormDefinition,
  openSlots,
  timeSlots,
  toFormDefinition,
} from '@/lib/forms'
import { openingHoursJsonLd, specialHoursJsonLd } from '@/lib/structuredData'
import {
  DEFAULT_SCHEDULE,
  formatPhone,
  mainContact,
  nationalHolidays,
  safeSchedule,
  safeSpecials,
  scheduleGroups,
  scheduleText,
  siteUnits,
  toUnit,
  unitErrors,
  upcomingSpecials,
} from '@/lib/units'

describe('D1: unidades', () => {
  it('formata telefones do Brasil e deixa o resto como veio', () => {
    expect(formatPhone('31999990000')).toBe('(31) 99999-0000')
    expect(formatPhone('+55 31 3333-4444')).toBe('(31) 3333-4444')
    expect(formatPhone('031 3333-4444')).toBe('(31) 3333-4444')
    expect(formatPhone('08001234567')).toBe('0800 123 4567')
    expect(formatPhone('190')).toBe('190')
    expect(formatPhone('')).toBe('')
  })

  it('agrupa os dias com o mesmo horário, de segunda a domingo', () => {
    expect(scheduleGroups(DEFAULT_SCHEDULE)).toEqual([
      { days: 'Seg a sex', hours: '8h às 18h' },
      { days: 'Sáb', hours: '8h às 12h' },
      { days: 'Dom', hours: null },
    ])
    expect(scheduleText(DEFAULT_SCHEDULE)).toBe('Seg a sex, 8h às 18h · Sáb, 8h às 12h')
    const twoDays = [
      null,
      null,
      null,
      null,
      null,
      { open: '18:00', close: '02:00' },
      { open: '18:00', close: '02:00' },
    ]
    expect(scheduleText(twoDays)).toBe('Sex e sáb, 18h às 2h')
  })

  it('descarta horário e datas especiais errados', () => {
    expect(safeSchedule('x')).toBeNull()
    expect(safeSchedule([null, null, null, null, null, null, null])).toBeNull()
    expect(
      safeSchedule([{ open: '25:00', close: '10:00' }, ...DEFAULT_SCHEDULE.slice(1)])?.[0],
    ).toBeNull()
    const specials = safeSpecials([
      { date: '2026-12-25', label: 'Natal', closed: true },
      { date: '2026-12-25', label: 'repetido', closed: true },
      { date: '2026-12-24', open: '08:00', close: '12:00' },
      { date: 'ontem', closed: true },
      { date: '2026-12-31', open: '10:00', close: '10:00' },
    ])
    expect(specials.map((item) => [item.date, item.closed])).toEqual([
      ['2026-12-24', false],
      ['2026-12-25', true],
      ['2026-12-31', true],
    ])
  })

  it('mostra só os dias especiais de hoje até 45 dias', () => {
    const specials = safeSpecials([
      { date: '2026-11-20', closed: true },
      { date: '2026-11-22', closed: true },
      { date: '2027-03-01', closed: true },
    ])
    expect(upcomingSpecials(specials, '2026-11-22').map((item) => item.date)).toEqual([
      '2026-11-22',
    ])
  })

  it('feriados nacionais com os móveis certos (Páscoa de 2027 em 28/3)', () => {
    const holidays = nationalHolidays(2027)
    expect(holidays.find((item) => item.label === 'Sexta-feira Santa')?.date).toBe('2027-03-26')
    expect(holidays.find((item) => item.label === 'Carnaval')?.date).toBe('2027-02-09')
    expect(holidays.find((item) => item.label === 'Corpus Christi')?.date).toBe('2027-05-27')
    expect(holidays).toHaveLength(12)
  })

  it('o contato de antes vira uma unidade, e a primeira manda nos campos de sempre', () => {
    const legacy = siteUnits({ whatsapp: '31999990000', hours: 'Seg a sáb' })
    expect(legacy).toHaveLength(1)
    expect(legacy[0].hoursNote).toBe('Seg a sáb')
    expect(siteUnits({})).toEqual([])
    const units = [
      toUnit({ name: 'Centro', whatsapp: '(31) 99999-0000', schedule: DEFAULT_SCHEDULE }),
      toUnit({ name: 'Savassi', phone: '3133334444' }),
    ]
    expect(mainContact(units)).toEqual({
      whatsapp: '(31) 99999-0000',
      phone: null,
      address: null,
      hours: 'Seg a sex, 8h às 18h · Sáb, 8h às 12h',
    })
    expect(mainContact([])).toEqual({ whatsapp: null, phone: null, address: null, hours: null })
  })

  it('com mais de uma unidade, cada uma precisa de nome', () => {
    expect(unitErrors(toUnit({}), 1)).toEqual({})
    expect(unitErrors(toUnit({}), 2).name).toBeTruthy()
    expect(unitErrors(toUnit({ name: 'A', whatsapp: '123' }), 2).whatsapp).toBeTruthy()
  })

  it('o horário vai para o Google no formato dele, com feriado fechado às 00:00', () => {
    expect(openingHoursJsonLd(DEFAULT_SCHEDULE)).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '08:00',
        closes: '12:00',
      },
    ])
    expect(specialHoursJsonLd(safeSpecials([{ date: '2026-12-25', closed: true }]))).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        validFrom: '2026-12-25',
        validThrough: '2026-12-25',
        opens: '00:00',
        closes: '00:00',
      },
    ])
  })
})

describe('D2: campos novos do formulário', () => {
  const form: FormDefinition = toFormDefinition({
    id: 1,
    title: 'Agenda',
    fields: [
      { blockType: 'unit', name: 'unidade', label: 'Unidade', required: true },
      {
        blockType: 'date',
        name: 'dia',
        label: 'Dia',
        required: true,
        days: 7,
        weekdays: '1,2,3,4,5',
      },
      {
        blockType: 'time',
        name: 'hora',
        label: 'Horário',
        required: true,
        from: '09:00',
        to: '12:00',
        step: 60,
      },
      { blockType: 'file', name: 'foto', label: 'Foto', required: false, accept: 'photo' },
    ],
  })
  // Segunda, 23/11/2026, 10h20 em Brasília.
  const now = new Date('2026-11-23T13:20:00Z')

  it('lê as opções com padrão quando faltam', () => {
    const plain = toFormDefinition({
      id: 2,
      fields: [
        { blockType: 'time', name: 'h', label: 'H' },
        { blockType: 'date', name: 'd', label: 'D' },
      ],
    })
    expect(plain.fields[0]).toMatchObject({ from: '08:00', to: '18:00', step: 30 })
    expect(plain.fields[1]).toMatchObject({ days: 30, weekdays: [1, 2, 3, 4, 5, 6] })
    expect(form.fields[3].accept).toBe('photo')
  })

  it('dias de hoje até N à frente, só nos dias da semana marcados', () => {
    expect(bookableDays('2026-11-23', 7, [1, 2, 3, 4, 5])).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-30',
    ])
    expect(dayText('2026-11-23')).toBe('23/11/2026 (segunda-feira)')
  })

  it('horários: hoje, os que já passaram somem; outro dia, todos', () => {
    const slots = timeSlots('09:00', '12:00', 60)
    expect(slots).toEqual(['09:00', '10:00', '11:00'])
    expect(openSlots(slots, '2026-11-23', now)).toEqual(['11:00'])
    expect(openSlots(slots, '2026-11-24', now)).toEqual(slots)
    expect(openSlots(slots, '', now)).toEqual(slots)
  })

  it('confere unidade, dia, horário e arquivo no envio', () => {
    const send = (values: Record<string, string>, units = ['Centro', 'Savassi']) =>
      checkSubmission(
        form,
        Object.entries(values).map(([field, value]) => ({ field, value })),
        { now, units },
      )
    const good = send({
      unidade: 'Savassi',
      dia: '2026-11-24',
      hora: '09:00',
      foto: '12.abcdefghijklmnopqrstuv',
    })
    expect(good).toEqual({
      ok: true,
      data: [
        { field: 'unidade', value: 'Savassi' },
        { field: 'dia', value: '24/11/2026 (terça-feira)' },
        { field: 'hora', value: '09:00' },
        { field: 'foto', value: '12.abcdefghijklmnopqrstuv' },
      ],
      files: [{ field: 'foto', id: 12, token: 'abcdefghijklmnopqrstuv' }],
    })
    expect(send({ unidade: 'Outra', dia: '2026-11-24', hora: '09:00' })).toMatchObject({
      ok: false,
    })
    // Sábado não está nos dias marcados; dia passado também não vale.
    expect(send({ unidade: 'Centro', dia: '2026-11-28', hora: '09:00' })).toMatchObject({
      ok: false,
    })
    expect(send({ unidade: 'Centro', dia: '2026-11-20', hora: '09:00' })).toMatchObject({
      ok: false,
    })
    // Hoje às 9h já passou.
    expect(send({ unidade: 'Centro', dia: '2026-11-23', hora: '09:00' })).toEqual({
      ok: false,
      message: 'O horário de “Horário” já passou. Escolha outro.',
    })
    expect(send({ unidade: 'Centro', dia: '2026-11-24', hora: '09:30' })).toMatchObject({
      ok: false,
    })
    expect(
      send({ unidade: 'Centro', dia: '2026-11-24', hora: '09:00', foto: '../x' }),
    ).toMatchObject({ ok: false })
    // Sem unidade nas Configurações, o campo some (nem obrigatório fica).
    expect(send({ dia: '2026-11-24', hora: '10:00' }, [])).toMatchObject({ ok: true })
  })

  it('arquivo: 0 byte, mais de 10 MB e tipo errado são recusados', () => {
    expect(checkFile({ name: 'a.jpg', type: 'image/jpeg', size: 0 }, 'photo')).toMatch(/vazio/)
    expect(
      checkFile({ name: 'a.jpg', type: 'image/jpeg', size: FILE_MAX_BYTES + 1 }, 'photo'),
    ).toMatch(/máximo é 10 MB/)
    expect(checkFile({ name: 'a.jpg', type: 'image/jpeg', size: FILE_MAX_BYTES }, 'photo')).toBe(
      true,
    )
    expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 10 }, 'photo')).toMatch(
      /não vale/,
    )
    expect(checkFile({ name: 'a.pdf', type: 'application/pdf', size: 10 }, 'document')).toBe(true)
    // HEIC do iPhone chega sem tipo: vale pela extensão.
    expect(checkFile({ name: 'IMG_1.HEIC', type: '', size: 10 }, 'photo')).toBe(true)
    expect(checkFile({ name: 'virus.exe', type: '', size: 10 }, 'document')).toMatch(/não vale/)
  })
})
