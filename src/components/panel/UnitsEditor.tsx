'use client'

import React, { useEffect, useState } from 'react'

import { todayInBrazil } from '@/lib/events'
import {
  DEFAULT_SCHEDULE,
  type DayHours,
  formatPhone,
  nextHolidays,
  type Schedule,
  scheduleText,
  shortDate,
  SPECIALS_MAX,
  type SpecialDay,
  specialHoursText,
  type Unit,
  unitErrors,
  unitHoursText,
  unitName,
  UNITS_MAX,
} from '@/lib/units'

import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'

/** Id de linha do Payload para uma unidade nova (texto de 24 letras, como os que ele cria). */
const newRowID = () => crypto.randomUUID().replace(/-/g, '').slice(0, 24)

const blankUnit = (): Unit => ({
  id: newRowID(),
  name: '',
  address: '',
  phone: '',
  phone2: '',
  whatsapp: '',
  schedule: DEFAULT_SCHEDULE,
  hoursNote: '',
  specials: [],
})

type Props = {
  units: Unit[]
  /** Erros da tela por campo (`unit-0-name`, `unit-2-whatsapp`). */
  errors: Record<string, string>
  onChange: (units: Unit[]) => void
}

/**
 * D1: as unidades do negócio, em Configurações › Contato. Cada uma aparece numa linha com o resumo
 * e é editada numa janela própria. A primeira é a principal.
 */
export function UnitsEditor({ units, errors, onChange }: Props) {
  // Índice da unidade aberta na janela; `units.length` é uma unidade nova.
  const [editing, setEditing] = useState<number | null>(null)
  const [removed, setRemoved] = useState<{ unit: Unit; index: number } | null>(null)
  useEffect(() => {
    if (!removed) return
    const timer = setTimeout(() => setRemoved(null), 8000)
    return () => clearTimeout(timer)
  }, [removed])

  const move = (index: number, by: -1 | 1) => {
    const next = [...units]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item)
    onChange(next)
  }
  const remove = (index: number) => {
    setRemoved({ unit: units[index], index })
    onChange(units.filter((_, position) => position !== index))
  }
  const undo = () => {
    if (!removed) return
    const next = [...units]
    next.splice(Math.min(removed.index, next.length), 0, removed.unit)
    onChange(next.slice(0, UNITS_MAX))
    setRemoved(null)
  }
  const full = units.length >= UNITS_MAX

  return (
    <div className="gp-units">
      <div>
        <span className="gp-label">Unidades</span>
        <p className="gp-small gp-muted">
          {units.length > 1
            ? 'A primeira é a principal: o rodapé, o topo e os botões de WhatsApp usam os dados dela. A seção “Nossas unidades” mostra todas.'
            : 'Endereço, telefones, WhatsApp e horário. Tem mais de um endereço? Adicione as outras unidades.'}
        </p>
      </div>
      {units.length > 0 && (
        <ul className="gp-units__list">
          {units.map((unit, index) => {
            const problems = Object.keys(errors).filter((key) => key.startsWith(`unit-${index}-`))
            const hours = unitHoursText(unit)
            const name = unitName(unit, index)
            return (
              <li className="gp-unit" key={unit.id}>
                <div className="gp-unit__text">
                  <b>
                    {name}
                    {index === 0 && units.length > 1 && (
                      <span className="gp-unit__badge">Principal</span>
                    )}
                  </b>
                  <span className="gp-small gp-muted">
                    {[unit.address.split('\n')[0], unit.whatsapp || unit.phone, hours]
                      .filter(Boolean)
                      .join(' · ') || 'Nada preenchido ainda'}
                  </span>
                  {problems.length > 0 && (
                    <span className="gp-hint gp-hint--error">{errors[problems[0]]}</span>
                  )}
                </div>
                <div className="gp-unit__moves">
                  <button
                    className="gp-btn gp-btn--sm"
                    onClick={() => setEditing(index)}
                    type="button"
                  >
                    Editar<span className="gp-sr"> {name}</span>
                  </button>
                  {units.length > 1 && (
                    <>
                      <button
                        aria-label={`Subir ${name}`}
                        className="gp-iconbtn gp-iconbtn--move"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        type="button"
                      >
                        <PanelIcon name="up" size={18} />
                      </button>
                      <button
                        aria-label={`Descer ${name}`}
                        className="gp-iconbtn gp-iconbtn--move"
                        disabled={index === units.length - 1}
                        onClick={() => move(index, 1)}
                        type="button"
                      >
                        <PanelIcon name="down" size={18} />
                      </button>
                    </>
                  )}
                  <button
                    aria-label={`Tirar ${name}`}
                    className="gp-iconbtn gp-iconbtn--move"
                    onClick={() => remove(index)}
                    type="button"
                  >
                    <PanelIcon name="x" size={18} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {removed && (
        <p className="gp-notice gp-undo" role="status">
          <span>“{unitName(removed.unit, removed.index)}” saiu da lista.</span>
          <button className="gp-btn gp-btn--sm" onClick={undo} type="button">
            Desfazer
          </button>
        </p>
      )}
      <div className="gp-addrow">
        <button
          aria-describedby={full ? 'st-units-why' : undefined}
          className="gp-btn gp-btn--sm"
          disabled={full}
          onClick={() => setEditing(units.length)}
          type="button"
        >
          <PanelIcon name="plus" size={14} />
          {units.length ? 'Adicionar unidade' : 'Adicionar endereço e horário'}
        </button>
        {full && (
          <span className="gp-hint" id="st-units-why">
            Já são {UNITS_MAX} unidades, o máximo. Tire uma para colocar outra.
          </span>
        )}
      </div>
      {editing !== null && (
        <UnitDialog
          index={editing}
          initial={units[editing] ?? blankUnit()}
          isNew={editing >= units.length}
          onClose={() => setEditing(null)}
          onSave={(unit) => {
            const next = [...units]
            next[editing] = unit
            onChange(next)
            setEditing(null)
          }}
          total={Math.max(units.length, editing + 1)}
        />
      )}
    </div>
  )
}

type DialogProps = {
  index: number
  initial: Unit
  isNew: boolean
  total: number
  onClose: () => void
  onSave: (unit: Unit) => void
}

/** A janela de uma unidade: dados, horário da semana e datas especiais. */
function UnitDialog({ index, initial, isNew, total, onClose, onSave }: DialogProps) {
  const [unit, setUnit] = useState<Unit>(initial)
  const [tried, setTried] = useState(false)
  const change = (next: Partial<Unit>) => setUnit((current) => ({ ...current, ...next }))
  const errors = unitErrors(unit, total)
  const shown = tried ? errors : {}

  const save = () => {
    if (Object.keys(errors).length) {
      setTried(true)
      return
    }
    onSave(unit)
  }

  const field = (
    key: 'name' | 'phone' | 'phone2' | 'whatsapp',
    label: string,
    hint: string,
    phone = false,
  ) => (
    <div className="gp-field">
      <label htmlFor={`un-${key}`}>{label}</label>
      <input
        aria-describedby={`un-${key}-hint`}
        aria-invalid={Boolean(shown[key])}
        autoComplete="off"
        className="gp-input"
        id={`un-${key}`}
        inputMode={phone ? 'tel' : undefined}
        maxLength={key === 'name' ? 60 : 40}
        onBlur={(event) => {
          if (!phone) return
          const next = formatPhone(event.target.value)
          if (next !== event.target.value) change({ [key]: next })
        }}
        onChange={(event) => change({ [key]: event.target.value })}
        placeholder={key === 'name' ? (index === 0 ? 'Ex.: Matriz' : 'Ex.: Centro') : undefined}
        type={phone ? 'tel' : 'text'}
        value={unit[key]}
      />
      <span className={shown[key] ? 'gp-hint gp-hint--error' : 'gp-hint'} id={`un-${key}-hint`}>
        {shown[key] ?? hint}
      </span>
    </div>
  )

  return (
    <PanelDialog
      onClose={onClose}
      title={isNew ? 'Nova unidade' : `Editar ${unitName(initial, index)}`}
      wide
    >
      <div className="gp-stack gp-unitform">
        {field(
          'name',
          total > 1 ? 'Nome da unidade' : 'Nome da unidade (opcional)',
          total > 1
            ? 'Aparece na seção “Nossas unidades” e no botão do WhatsApp.'
            : 'Só precisa com mais de uma unidade.',
        )}
        <div className="gp-field">
          <label htmlFor="un-address">Endereço</label>
          <textarea
            className="gp-input"
            id="un-address"
            maxLength={300}
            onChange={(event) => change({ address: event.target.value })}
            placeholder="Rua, número, bairro e cidade"
            rows={2}
            value={unit.address}
          />
        </div>
        <div className="gp-grid2 gp-grid2--tight">
          {field('phone', 'Telefone', 'Com DDD. Fica no jeito de ler sozinho.', true)}
          {field('phone2', 'Outro telefone (opcional)', 'Ex.: o fixo da loja.', true)}
        </div>
        {field('whatsapp', 'WhatsApp', 'Com DDD. Ex.: (31) 99999-0000.', true)}
        <ScheduleEditor onChange={(schedule) => change({ schedule })} schedule={unit.schedule} />
        <div className="gp-field">
          <label htmlFor="un-note">Observação do horário (opcional)</label>
          <input
            className="gp-input"
            id="un-note"
            maxLength={120}
            onChange={(event) => change({ hoursNote: event.target.value })}
            placeholder="Ex.: Fecha para almoço das 12h às 13h."
            value={unit.hoursNote}
          />
          <span className="gp-hint">
            {unit.schedule
              ? 'Aparece embaixo do horário na seção “Nossas unidades”.'
              : 'Sem horário marcado acima, o site mostra este texto no lugar.'}
          </span>
        </div>
        <SpecialsEditor onChange={(specials) => change({ specials })} specials={unit.specials} />
        {tried && Object.keys(errors).length > 0 && (
          <p className="gp-error" role="alert">
            Corrija o que está marcado para salvar a unidade.
          </p>
        )}
        <div className="gp-actions gp-actions--end">
          <button className="gp-btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="gp-btn gp-btn--primary" onClick={save} type="button">
            {isNew ? 'Adicionar unidade' : 'Salvar unidade'}
          </button>
        </div>
      </div>
    </PanelDialog>
  )
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const sameHours = (a: DayHours, b: DayHours) =>
  a === b || (Boolean(a && b) && a!.open === b!.open && a!.close === b!.close)

/**
 * O horário da semana, com dois atalhos: "Seg a sex igual" (uma linha para os 5 dias) e
 * "Sáb diferente" (sem ele, o sábado segue a linha de segunda a sexta).
 */
function ScheduleEditor({
  schedule,
  onChange,
}: {
  schedule: Schedule | null
  onChange: (schedule: Schedule | null) => void
}) {
  const days = schedule ?? [null, null, null, null, null, null, null]
  const [weekdaysSame, setWeekdaysSame] = useState(() =>
    [2, 3, 4, 5].every((day) => sameHours(days[day], days[1])),
  )
  const [saturdayOwn, setSaturdayOwn] = useState(
    () => !sameHours(days[6], days[1]) || !weekdaysSame,
  )

  const set = (indexes: number[], value: DayHours) => {
    const next = [...days]
    for (const index of indexes) next[index] = value
    onChange(next.some(Boolean) ? next : null)
  }
  // Linhas que a tela mostra: cada uma com os dias que ela muda.
  const rows: { label: string; days: number[] }[] = []
  if (weekdaysSame) {
    rows.push(
      saturdayOwn
        ? { label: 'Seg a sex', days: [1, 2, 3, 4, 5] }
        : { label: 'Seg a sáb', days: [1, 2, 3, 4, 5, 6] },
    )
  } else {
    for (const day of [1, 2, 3, 4, 5]) rows.push({ label: DAY_NAMES[day], days: [day] })
    if (!saturdayOwn) rows[rows.length - 1].days.push(6)
  }
  if (saturdayOwn) rows.push({ label: 'Sábado', days: [6] })
  rows.push({ label: 'Domingo', days: [0] })

  return (
    <fieldset className="gp-fieldset gp-hours">
      <legend>Horário de funcionamento</legend>
      <div className="gp-hours__shortcuts">
        <label className="gp-switch">
          <input
            checked={weekdaysSame}
            onChange={(event) => {
              setWeekdaysSame(event.target.checked)
              if (event.target.checked) set([2, 3, 4, 5], days[1])
            }}
            type="checkbox"
          />
          Seg a sex igual
        </label>
        <label className="gp-switch">
          <input
            checked={saturdayOwn}
            onChange={(event) => {
              setSaturdayOwn(event.target.checked)
              if (!event.target.checked) set([6], days[5])
            }}
            type="checkbox"
          />
          Sáb diferente
        </label>
      </div>
      <ul className="gp-hours__rows">
        {rows.map((row) => {
          const day = days[row.days[0]]
          return (
            <li className="gp-hours__row" key={row.label}>
              <label className="gp-hours__open">
                <input
                  checked={Boolean(day)}
                  onChange={(event) =>
                    set(row.days, event.target.checked ? { open: '08:00', close: '18:00' } : null)
                  }
                  type="checkbox"
                />
                <span>{row.label}</span>
              </label>
              {day ? (
                <span className="gp-hours__times">
                  <input
                    aria-label={`${row.label}: abre às`}
                    className="gp-input"
                    onChange={(event) =>
                      event.target.value && set(row.days, { ...day, open: event.target.value })
                    }
                    step={900}
                    type="time"
                    value={day.open}
                  />
                  <span aria-hidden="true">às</span>
                  <input
                    aria-label={`${row.label}: fecha às`}
                    className="gp-input"
                    onChange={(event) =>
                      event.target.value && set(row.days, { ...day, close: event.target.value })
                    }
                    step={900}
                    type="time"
                    value={day.close}
                  />
                </span>
              ) : (
                <span className="gp-small gp-muted">Fechado</span>
              )}
            </li>
          )
        })}
      </ul>
      <span className="gp-hint">
        {schedule ? `No site: ${scheduleText(schedule)}.` : 'Marque os dias em que abre.'}
      </span>
    </fieldset>
  )
}

/** Feriados e horário especial: um dia de cada vez, ou os feriados nacionais de uma vez. */
function SpecialsEditor({
  specials,
  onChange,
}: {
  specials: SpecialDay[]
  onChange: (specials: SpecialDay[]) => void
}) {
  // O dia de hoje só no navegador (a janela abre no clique, nunca no servidor).
  const [today] = useState(() => todayInBrazil(new Date()))
  const [draft, setDraft] = useState<SpecialDay>({
    date: '',
    label: '',
    closed: true,
    open: '09:00',
    close: '13:00',
  })
  const sorted = (list: SpecialDay[]) =>
    [...list].sort((a, b) => a.date.localeCompare(b.date)).slice(0, SPECIALS_MAX)
  const upcoming = specials.filter((special) => special.date >= today)
  const past = specials.length - upcoming.length
  const full = specials.length >= SPECIALS_MAX
  const holidays = nextHolidays(today).filter(
    (holiday) => !specials.some((special) => special.date === holiday.date),
  )
  const timesOk = draft.closed || (draft.open && draft.close && draft.open !== draft.close)

  const add = () => {
    if (!draft.date || !timesOk || full) return
    onChange(
      sorted([
        ...specials.filter((special) => special.date !== draft.date),
        {
          ...draft,
          label: draft.label.trim(),
          open: draft.closed ? '' : draft.open,
          close: draft.closed ? '' : draft.close,
        },
      ]),
    )
    setDraft({ ...draft, date: '', label: '' })
  }

  return (
    <fieldset className="gp-fieldset gp-specials">
      <legend>Feriados e horário especial</legend>
      <p className="gp-small gp-muted">
        Dias em que fecha ou abre em outro horário. O site mostra os próximos na seção “Nossas
        unidades”, e o dia some sozinho depois que passa.
      </p>
      {upcoming.length > 0 && (
        <ul className="gp-specials__list">
          {upcoming.map((special) => (
            <li className="gp-specials__item" key={special.date}>
              <span>
                <b>{shortDate(special.date)}</b>
                {special.label && ` ${special.label}`}: {specialHoursText(special)}
              </span>
              <button
                aria-label={`Tirar ${shortDate(special.date)}${special.label ? ` ${special.label}` : ''}`}
                className="gp-iconbtn gp-iconbtn--move"
                onClick={() => onChange(specials.filter((item) => item.date !== special.date))}
                type="button"
              >
                <PanelIcon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {past > 0 && (
        <span className="gp-small gp-muted">
          {past === 1 ? '1 dia que já passou' : `${past} dias que já passaram`} (não aparecem no
          site).{' '}
          <button
            className="gp-link gp-linkbtn"
            onClick={() => onChange(specials.filter((special) => special.date >= today))}
            type="button"
          >
            Limpar
          </button>
        </span>
      )}
      <div className="gp-specials__new">
        <div className="gp-field">
          <label htmlFor="sp-date">Dia</label>
          <input
            className="gp-input"
            id="sp-date"
            min={today}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
            type="date"
            value={draft.date}
          />
        </div>
        <div className="gp-field">
          <label htmlFor="sp-label">Nome (opcional)</label>
          <input
            className="gp-input"
            id="sp-label"
            maxLength={60}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            placeholder="Ex.: Aniversário da cidade"
            value={draft.label}
          />
        </div>
        <div className="gp-field">
          <label htmlFor="sp-kind">Nesse dia</label>
          <select
            className="gp-input"
            id="sp-kind"
            onChange={(event) => setDraft({ ...draft, closed: event.target.value === 'closed' })}
            value={draft.closed ? 'closed' : 'open'}
          >
            <option value="closed">Fechado</option>
            <option value="open">Horário especial</option>
          </select>
        </div>
        {!draft.closed && (
          <span className="gp-hours__times gp-specials__times">
            <input
              aria-label="Horário especial: abre às"
              className="gp-input"
              onChange={(event) => setDraft({ ...draft, open: event.target.value })}
              step={900}
              type="time"
              value={draft.open}
            />
            <span aria-hidden="true">às</span>
            <input
              aria-label="Horário especial: fecha às"
              className="gp-input"
              onChange={(event) => setDraft({ ...draft, close: event.target.value })}
              step={900}
              type="time"
              value={draft.close}
            />
          </span>
        )}
      </div>
      <div className="gp-addrow">
        <button
          className="gp-btn gp-btn--sm"
          disabled={!draft.date || !timesOk || full}
          onClick={add}
          type="button"
        >
          <PanelIcon name="plus" size={14} />
          Adicionar o dia
        </button>
        {holidays.length > 0 && !full && (
          <button
            className="gp-btn gp-btn--sm gp-btn--ghost"
            onClick={() =>
              onChange(
                sorted([
                  ...specials,
                  ...holidays.map((holiday) => ({
                    ...holiday,
                    closed: true,
                    open: '',
                    close: '',
                  })),
                ]),
              )
            }
            type="button"
          >
            Fechar nos feriados nacionais
          </button>
        )}
        {full && (
          <span className="gp-hint">
            Já são {SPECIALS_MAX} dias, o máximo. Tire um para colocar outro.
          </span>
        )}
      </div>
    </fieldset>
  )
}
