'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { request } from '@/components/editor/api'
import { normalizeWhatsApp } from '@/lib/links'
import { panelHref } from '@/lib/panel'
import {
  BUSINESSES,
  type BusinessType,
  SITE_TYPES,
  type SiteType,
  templatePersonality,
} from '@/lib/templates'
import { PERSONALITY_LABELS } from '@/lib/theme'

import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { Tip } from './Tip'
import { TemplatePreview, type TemplatePreviewData } from './TemplatePreview'
import { WhyDisabled } from './WhyDisabled'

export type StartTemplate = TemplatePreviewData & {
  key: string
  siteType: SiteType
  /** O ramo, nos modelos do "Site da empresa" (`templateBusiness`). */
  business: BusinessType | null
}

type Props = {
  adminRoute: string
  apiRoute: string
  /** Páginas que o site já tem (no ar ou em rascunho). */
  existingPages: number
  /** Começar de novo: o nome, a frase e o WhatsApp das Configurações, e a cidade tirada do endereço. */
  initial: { name: string; tagline: string; whatsapp: string; city: string } | null
  /** Delas, as que estão no ar: saem do ar ao aplicar o modelo. */
  livePages: number
  /** As Configurações têm mudança fora do ar: trocar de modelo descarta. */
  settingsDraft: boolean
  templates: StartTemplate[]
}

type Step = 'type' | 'segment' | 'basics' | 'model'

// Os quatro passos aparecem na barra desde o começo. O ramo só é perguntado no site da empresa;
// nos outros tipos, ele é pulado e aparece como feito. O básico vem antes do modelo (entrega 6):
// as prévias dos modelos já mostram o nome do negócio e a cidade nos textos de exemplo.
const STEP_NAMES: [Step, string][] = [
  ['type', 'Tipo de site'],
  ['segment', 'Ramo'],
  ['basics', 'O básico'],
  ['model', 'Modelo'],
]

/**
 * Só os passos deste caminho: sem o Ramo quando o tipo não pede. Cada nome fica embaixo da sua barra.
 */
function StepBar({ current, steps }: { current: Step; steps: Step[] }) {
  const names = STEP_NAMES.filter(([step]) => steps.includes(step))
  const position = names.findIndex(([step]) => step === current)
  const label = names[position][1]
  return (
    <div className="gp-stepbar" style={{ '--gp-steps': names.length } as React.CSSProperties}>
      <div aria-hidden="true" className="gp-steps">
        {names.map(([step], index) => (
          <span className={index <= position ? 'is-on' : undefined} key={step} />
        ))}
      </div>
      <ol
        aria-label={`Passos do início: agora, ${label} (${position + 1} de ${names.length})`}
        className="gp-stepnames"
      >
        {names.map(([step, name], index) => (
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
  settingsDraft,
  templates,
}: Props) {
  const router = useRouter()
  const [type, setType] = useState<SiteType | null>(null)
  const [business, setBusiness] = useState<BusinessType | null>(null)
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [bigPreview, setBigPreview] = useState<StartTemplate | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps: Step[] =
    type === 'institucional' ? ['type', 'segment', 'basics', 'model'] : ['type', 'basics', 'model']
  const current = steps[step]
  const options = templates.filter(
    (item) => item.siteType === type && (type !== 'institucional' || item.business === business),
  )
  const chosen = options.find((item) => item.id === templateId) ?? null
  const availableTypes = SITE_TYPES.filter((item) =>
    templates.some((t) => t.siteType === item.value),
  )
  const availableBusinesses = BUSINESSES.filter((item) =>
    templates.some((t) => t.business === item.value),
  )

  // Trocar o tipo ou o ramo escolhe o primeiro modelo da lista nova.
  const firstOf = (nextType: SiteType, nextBusiness: BusinessType | null) =>
    templates.find(
      (item) =>
        item.siteType === nextType &&
        (nextType !== 'institucional' || item.business === nextBusiness),
    )?.id ?? null
  const chooseType = (value: SiteType) => {
    setType(value)
    setTemplateId(firstOf(value, business))
  }
  const chooseBusiness = (value: BusinessType) => {
    setBusiness(value)
    setTemplateId(firstOf('institucional', value))
  }

  const whatsappInvalid = Boolean(whatsapp.trim()) && !normalizeWhatsApp(whatsapp)
  const canGo =
    (current === 'type' && Boolean(type)) ||
    (current === 'segment' && Boolean(business)) ||
    (current === 'basics' && Boolean(name.trim()) && Boolean(city.trim()) && !whatsappInvalid) ||
    (current === 'model' && Boolean(chosen) && !busy)
  // O que falta para seguir, embaixo do botão desligado.
  const missing =
    canGo || busy
      ? null
      : current === 'model'
        ? 'Escolha um modelo para continuar'
        : current !== 'basics'
          ? 'Escolha uma opção para continuar'
          : !name.trim()
            ? 'Escreva o nome do negócio para continuar'
            : !city.trim()
              ? 'Escreva a cidade para continuar'
              : 'Confira o número do WhatsApp para continuar'

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
            city: city.trim(),
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
    // Com páginas de hoje, um clique troca o site inteiro: antes, uma confirmação.
    else if (existingPages > 0) setConfirming(true)
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

  // O que o modelo sugere para o ramo. Só a personalidade: o nome das letras ("Cormorant Garamond")
  // não diz nada para quem não é do ramo; as letras aparecem na própria prévia.
  const lookNote = (template: StartTemplate) => {
    const personality = templatePersonality(template.key)
    return personality ? `Personalidade ${PERSONALITY_LABELS[personality].name}` : ''
  }

  const pagesNote = (template: StartTemplate) =>
    template.pageTitles.length > 1
      ? `Os dois já vêm com ${template.pageTitles.length} páginas: ${template.pageTitles.join(', ')}.`
      : 'Os dois são uma página só, já montada.'

  return (
    <div className="gp-onboard">
      <div className="gp-ob">
        <StepBar current={current} steps={steps} />

        <div className="gp-obcard">
          {current === 'type' && (
            <>
              <h1>O que você quer montar?</h1>
              <p className="gp-muted">
                Escolha o formato. Depois você pode criar outras páginas dentro do mesmo site, como
                uma página para uma promoção.
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
                Usamos isso para escolher as páginas, a ordem das seções e os textos de exemplo, e
                para sugerir cores e letras que combinam com o ramo.
              </p>
              <Choices
                label="Ramo do negócio"
                onChange={chooseBusiness}
                options={availableBusinesses}
                value={business}
              />
            </>
          )}

          {current === 'basics' && chosen && (
            <>
              <h1>Agora, o básico</h1>
              <p className="gp-muted">
                Usamos esses dados no topo da página, no rodapé, no Google e nos textos de exemplo
                do modelo. Dá para mudar tudo depois.
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
                <label htmlFor="ob-city">Cidade</label>
                <input
                  aria-describedby="ob-city-hint"
                  autoComplete="address-level2"
                  className="gp-input"
                  id="ob-city"
                  maxLength={60}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Ex.: Uberlândia"
                  value={city}
                />
                <span className="gp-hint" id="ob-city-hint">
                  Entra nos textos de exemplo, como “Entregamos em Uberlândia”. Se atende só pela
                  internet, escreva “todo o Brasil”.
                </span>
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
            </>
          )}

          {current === 'model' && (
            <>
              <h1>Escolha um modelo</h1>
              <p className="gp-muted">
                {options[0] && pagesNote(options[0])} Os textos são exemplos do seu ramo, já com o
                nome e a cidade que você escreveu: troque pelos seus. As fotos ficam para você
                escolher.
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
                      <TemplatePreview city={city} name={name} template={option} />
                    </div>
                    <div className="gp-tplsite__meta">
                      <div>
                        <b>
                          {option.name}
                          {option.id === templateId && (
                            <span className="gp-chip gp-chip--ok">Escolhido</span>
                          )}
                        </b>
                        <span className="gp-small gp-muted">{option.description}</span>
                        <span className="gp-small gp-tplsite__look">{lookNote(option)}</span>
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
                    {livePages === 1 && 'Ela sai do ar. '}
                    {livePages > 1 && 'Elas saem do ar. '}
                    As páginas de hoje ficam guardadas em Páginas, no grupo Arquivadas. O menu, o
                    rodapé, as cores e as letras passam a ser os do modelo. O contato e o e-mail
                    continuam os mesmos.
                  </span>
                  {settingsDraft && (
                    <span>
                      As mudanças das Configurações que ainda não foram publicadas serão
                      descartadas.
                    </span>
                  )}
                </div>
              )}
              <Tip>
                A personalidade, as cores e as letras do modelo são sugestões para o seu ramo. Em
                Sua marca você escolhe quaisquer outras.
              </Tip>
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
            <div className="gp-btnwrap">
              <button
                aria-describedby={missing ? 'ob-why' : undefined}
                className="gp-btn gp-btn--primary gp-btn--lg"
                disabled={!canGo}
                onClick={next}
                type="button"
              >
                {current !== 'model'
                  ? 'Continuar'
                  : busy
                    ? 'Montando seu site…'
                    : existingPages > 0
                      ? 'Trocar meu site por este modelo'
                      : 'Criar meu site'}
              </button>
              <WhyDisabled id="ob-why" reason={missing} />
            </div>
          </div>
          {busy && (
            <p aria-live="polite" className="gp-small gp-muted">
              Criando as páginas, o menu e os formulários. Leva alguns segundos.
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

      {confirming && chosen && (
        <PanelDialog onClose={() => setConfirming(false)} title="Trocar o site agora?">
          <p>
            {livePages === 0
              ? 'Nenhuma página está no ar hoje, mas as páginas de hoje vão para Arquivadas.'
              : livePages === 1
                ? 'A página que está no ar hoje sai do ar e vai para Arquivadas.'
                : `As ${livePages} páginas que estão no ar hoje saem do ar e vão para Arquivadas.`}{' '}
            O site passa a ser o modelo {chosen.name}, com o menu, o rodapé, as cores e as letras
            dele.
          </p>
          <div className="gp-actions gp-actions--end">
            <button className="gp-btn" onClick={() => setConfirming(false)} type="button">
              Cancelar
            </button>
            <button
              className="gp-btn gp-btn--solid-danger"
              onClick={() => {
                setConfirming(false)
                void create()
              }}
              type="button"
            >
              Sim, trocar meu site
            </button>
          </div>
        </PanelDialog>
      )}

      {bigPreview && (
        <PanelDialog onClose={() => setBigPreview(null)} title={`Modelo ${bigPreview.name}`} wide>
          <p className="gp-small gp-muted">
            {bigPreview.pageTitles.length > 1 ? 'Página inicial' : 'A página'} com textos de
            exemplo. O desenho no lugar das fotos mostra onde vão as suas.
          </p>
          <div className="gp-bigprev">
            <TemplatePreview city={city} name={name} template={bigPreview} />
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
