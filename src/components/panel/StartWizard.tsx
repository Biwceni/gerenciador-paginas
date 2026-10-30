'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { request } from '@/components/editor/api'
import { normalizeWhatsApp } from '@/lib/links'
import { panelHref } from '@/lib/panel'
import { SEGMENTS, type Segment, SITE_TYPES, type SiteType } from '@/lib/templates'

import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { TemplatePreview, type TemplatePreviewData } from './TemplatePreview'

export type StartTemplate = TemplatePreviewData & { siteType: SiteType; segment: Segment | null }

type Props = {
  adminRoute: string
  apiRoute: string
  /** Páginas que o site já tem (no ar ou em rascunho). */
  existingPages: number
  /** Começar de novo: o nome, a frase e o WhatsApp que estão nas Configurações. */
  initial: { name: string; tagline: string; whatsapp: string } | null
  /** Delas, as que estão no ar: saem do ar ao aplicar o modelo. */
  livePages: number
  templates: StartTemplate[]
}

type Step = 'type' | 'segment' | 'model' | 'basics'

// Os quatro passos aparecem na barra desde o começo. O ramo só é perguntado no site da empresa;
// nos outros tipos, ele é pulado e aparece como feito.
const STEP_NAMES: [Step, string][] = [
  ['type', 'Tipo de site'],
  ['segment', 'Ramo'],
  ['model', 'Modelo'],
  ['basics', 'O básico'],
]

function StepBar({ current }: { current: Step }) {
  const position = STEP_NAMES.findIndex(([step]) => step === current)
  const label = STEP_NAMES[position][1]
  return (
    <div className="gp-stepbar">
      <div aria-hidden="true" className="gp-steps">
        {STEP_NAMES.map(([step], index) => (
          <span className={index <= position ? 'is-on' : undefined} key={step} />
        ))}
      </div>
      <ol aria-label={`Passos do início: agora, ${label}`} className="gp-stepnames">
        {STEP_NAMES.map(([step, name], index) => (
          <li
            aria-current={index === position ? 'step' : undefined}
            className={index <= position ? 'is-on' : undefined}
            key={step}
          >
            {name}
          </li>
        ))}
      </ol>
    </div>
  )
}

const NAME_LABEL: Partial<Record<SiteType, string>> = {
  pessoal: 'Seu nome',
  evento: 'Nome do evento',
}

/** Cartões de escolha única (tipo de site e ramo), como o `typegrid` do protótipo. */
function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly {
    value: T
    label: string
    text: string
    icon: React.ComponentProps<typeof PanelIcon>['name']
  }[]
  value: T | null
  onChange: (value: T) => void
}) {
  return (
    <div aria-label={label} className="gp-typegrid" role="radiogroup">
      {options.map((option) => (
        <button
          aria-checked={value === option.value}
          className="gp-typecard"
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          <span className="gp-typecard__icon">
            <PanelIcon name={option.icon} size={20} />
          </span>
          <b>{option.label}</b>
          <span className="gp-small gp-muted">{option.text}</span>
        </button>
      ))}
    </div>
  )
}

export function StartWizard({
  adminRoute,
  apiRoute,
  existingPages,
  initial,
  livePages,
  templates,
}: Props) {
  const router = useRouter()
  const [type, setType] = useState<SiteType | null>(null)
  const [segment, setSegment] = useState<Segment | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial?.name ?? '')
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [bigPreview, setBigPreview] = useState<StartTemplate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps: Step[] =
    type === 'institucional' ? ['type', 'segment', 'model', 'basics'] : ['type', 'model', 'basics']
  const current = steps[step]
  const options = templates.filter(
    (item) => item.siteType === type && (type !== 'institucional' || item.segment === segment),
  )
  const chosen = options.find((item) => item.id === templateId) ?? null
  const availableTypes = SITE_TYPES.filter((item) =>
    templates.some((t) => t.siteType === item.value),
  )
  const availableSegments = SEGMENTS.filter((item) =>
    templates.some((t) => t.siteType === 'institucional' && t.segment === item.value),
  )

  // Trocar o tipo ou o ramo escolhe o primeiro modelo da lista nova.
  const firstOf = (nextType: SiteType, nextSegment: Segment | null) =>
    templates.find(
      (item) =>
        item.siteType === nextType &&
        (nextType !== 'institucional' || item.segment === nextSegment),
    )?.id ?? null
  const chooseType = (value: SiteType) => {
    setType(value)
    setTemplateId(firstOf(value, segment))
  }
  const chooseSegment = (value: Segment) => {
    setSegment(value)
    setTemplateId(firstOf('institucional', value))
  }

  const whatsappInvalid = Boolean(whatsapp.trim()) && !normalizeWhatsApp(whatsapp)
  const canGo =
    (current === 'type' && Boolean(type)) ||
    (current === 'segment' && Boolean(segment)) ||
    (current === 'model' && Boolean(chosen)) ||
    (current === 'basics' && Boolean(name.trim()) && !whatsappInvalid && !busy)

  const create = async () => {
    if (!chosen) return
    setBusy(true)
    setError(null)
    try {
      const { missingPhotos } = await request<{ missingPhotos: number }>(
        apiRoute,
        `/templates/${chosen.id}/aplicar`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            tagline: tagline.trim(),
            whatsapp: whatsapp.trim(),
          }),
        },
      )
      // O aviso de pronto diz quantas fotos de exemplo não deu para copiar.
      const photos = missingPhotos > 0 ? `&fotos=${missingPhotos}` : ''
      router.push(`${panelHref(adminRoute, 'dashboard')}?pronto=1${photos}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
      setBusy(false)
    }
  }

  const next = () => {
    if (!canGo) return
    if (step < steps.length - 1) setStep(step + 1)
    else void create()
  }

  if (!templates.length) {
    return (
      <div className="gp-onboard">
        <div className="gp-ob">
          <div className="gp-obcard">
            <h1>Nenhum modelo cadastrado</h1>
            <p className="gp-muted">
              Os modelos ainda não foram gravados neste site. Peça para a equipe rodar{' '}
              <code>npm run modelos</code>.
            </p>
            <div>
              <Link className="gp-btn" href={panelHref(adminRoute, 'pages')}>
                Ir para as páginas
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pagesNote = (template: StartTemplate) =>
    template.pageTitles.length > 1
      ? `Os dois já vêm com ${template.pageTitles.length} páginas: ${template.pageTitles.join(', ')}.`
      : 'Os dois são uma página só, já montada.'

  return (
    <div className="gp-onboard">
      <div className="gp-ob">
        <StepBar current={current} />

        <div className="gp-obcard">
          {current === 'type' && (
            <>
              <h1>O que você quer montar?</h1>
              <p className="gp-muted">
                Escolha o formato. Depois você pode criar outras páginas, como landing pages de
                campanha, dentro do mesmo site.
              </p>
              <Choices
                label="Tipo de site"
                onChange={chooseType}
                options={availableTypes}
                value={type}
              />
            </>
          )}

          {current === 'segment' && (
            <>
              <h1>Qual é o ramo do seu negócio?</h1>
              <p className="gp-muted">
                Usamos isso para escolher as páginas, os textos e as fotos de exemplo.
              </p>
              <Choices
                label="Ramo do negócio"
                onChange={chooseSegment}
                options={availableSegments}
                value={segment}
              />
            </>
          )}

          {current === 'model' && (
            <>
              <h1>Escolha um modelo</h1>
              <p className="gp-muted">
                {options[0] && pagesNote(options[0])} Os textos são Lorem Ipsum, só para mostrar o
                lugar de cada coisa. Você troca tudo depois.
              </p>
              <div aria-label="Modelos" className="gp-tplsites" role="radiogroup">
                {options.map((option) => (
                  <div
                    className={`gp-tplsite${option.id === templateId ? ' is-on' : ''}`}
                    key={option.id}
                  >
                    {/* Um iframe não pode ficar dentro de um botão: o cartão faz o papel dele. */}
                    <div
                      aria-checked={option.id === templateId}
                      aria-label={`Escolher o modelo ${option.name}`}
                      className="gp-tplsite__preview"
                      onClick={() => setTemplateId(option.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setTemplateId(option.id)
                        }
                      }}
                      role="radio"
                      tabIndex={0}
                    >
                      <TemplatePreview template={option} />
                    </div>
                    <div className="gp-tplsite__meta">
                      <div>
                        <b>{option.name}</b>
                        <span className="gp-small gp-muted">{option.description}</span>
                      </div>
                      <button
                        className="gp-btn gp-btn--sm"
                        onClick={() => setBigPreview(option)}
                        type="button"
                      >
                        <PanelIcon name="eye" size={14} />
                        Ver maior
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="gp-tip">
                <PanelIcon name="help" size={16} />
                <span>
                  As cores e as letras do modelo são só um começo. Em Configurações você escolhe
                  quaisquer outras.
                </span>
              </p>
            </>
          )}

          {current === 'basics' && chosen && (
            <>
              <h1>Agora, o básico</h1>
              <p className="gp-muted">
                Usamos esses dados no topo da página, no rodapé e no Google. Dá para mudar tudo
                depois.
              </p>
              <div className="gp-field">
                <label htmlFor="ob-name">{(type && NAME_LABEL[type]) || 'Nome do negócio'}</label>
                <input
                  className="gp-input"
                  id="ob-name"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={chosen.site?.name ? `Ex.: ${chosen.site.name}` : undefined}
                  value={name}
                />
              </div>
              <div className="gp-field">
                <label htmlFor="ob-tagline">Em uma frase, do que se trata?</label>
                <textarea
                  className="gp-input"
                  id="ob-tagline"
                  maxLength={200}
                  onChange={(event) => setTagline(event.target.value)}
                  placeholder={chosen.site?.tagline ? `Ex.: ${chosen.site.tagline}` : undefined}
                  rows={2}
                  value={tagline}
                />
                <span className="gp-hint">
                  Aparece no topo da página e no Google. Se deixar em branco, dá para escrever
                  depois em Configurações; o exemplo nunca vai para o site.
                </span>
              </div>
              <div className="gp-field">
                <label htmlFor="ob-whatsapp">WhatsApp (se quiser)</label>
                <input
                  aria-describedby="ob-whatsapp-hint"
                  aria-invalid={whatsappInvalid || undefined}
                  className="gp-input"
                  id="ob-whatsapp"
                  inputMode="tel"
                  maxLength={30}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  placeholder="(31) 99999-0000"
                  value={whatsapp}
                />
                <span className="gp-hint" id="ob-whatsapp-hint">
                  {whatsappInvalid
                    ? 'Digite o número com DDD. Ex.: (31) 99999-0000.'
                    : 'Os botões de WhatsApp do site usam este número. Dá para pôr ou mudar depois em Configurações.'}
                </span>
              </div>
              {existingPages > 0 && (
                <div className="gp-warnbox" role="note">
                  <b>
                    {livePages === 0
                      ? 'Nenhuma página do seu site está no ar hoje.'
                      : livePages === 1
                        ? 'Seu site tem 1 página no ar hoje.'
                        : `Seu site tem ${livePages} páginas no ar hoje.`}
                  </b>
                  <span>
                    {livePages > 0 && 'Elas saem do ar. '}
                    As páginas de hoje ficam guardadas em Páginas, no grupo Arquivadas. O menu, o
                    rodapé, as cores e as letras passam a ser os do modelo. O contato e o e-mail
                    continuam os mesmos.
                  </span>
                </div>
              )}
              {error && (
                <p className="gp-error" role="alert">
                  Não deu para criar o site: {error}
                </p>
              )}
            </>
          )}

          <div className="gp-obnav">
            {step > 0 ? (
              <button
                className="gp-btn"
                disabled={busy}
                onClick={() => setStep(step - 1)}
                type="button"
              >
                <PanelIcon name="back" size={16} />
                Voltar
              </button>
            ) : (
              <span />
            )}
            <button
              className="gp-btn gp-btn--primary gp-btn--lg"
              disabled={!canGo}
              onClick={next}
              type="button"
            >
              {current !== 'basics'
                ? 'Continuar'
                : busy
                  ? 'Montando seu site…'
                  : existingPages > 0
                    ? 'Trocar meu site por este modelo'
                    : 'Criar meu site'}
            </button>
          </div>
          {busy && (
            <p aria-live="polite" className="gp-small gp-muted">
              Copiando as fotos e criando as páginas. Pode levar até um minuto.
            </p>
          )}
        </div>

        {existingPages > 0 ? (
          <Link
            className="gp-btn gp-btn--ghost gp-ob__leave"
            href={panelHref(adminRoute, 'settings')}
          >
            <PanelIcon name="back" size={16} />
            Voltar sem mudar nada
          </Link>
        ) : (
          <Link
            className="gp-btn gp-btn--ghost gp-ob__leave"
            href={`${panelHref(adminRoute, 'dashboard')}?pular=1`}
          >
            Prefiro montar sozinho, página por página
          </Link>
        )}
      </div>

      {bigPreview && (
        <PanelDialog onClose={() => setBigPreview(null)} title={`Modelo ${bigPreview.name}`} wide>
          <p className="gp-small gp-muted">
            {bigPreview.pageTitles.length > 1 ? 'Página inicial' : 'A página'} com textos e fotos de
            exemplo.
          </p>
          <div className="gp-bigprev">
            <TemplatePreview template={bigPreview} />
          </div>
          <div className="gp-actions gp-actions--end">
            <button className="gp-btn" onClick={() => setBigPreview(null)} type="button">
              Fechar
            </button>
            <button
              className="gp-btn gp-btn--primary"
              onClick={() => {
                setTemplateId(bigPreview.id)
                setBigPreview(null)
              }}
              type="button"
            >
              Usar este modelo
            </button>
          </div>
        </PanelDialog>
      )}
    </div>
  )
}
