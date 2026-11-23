'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useMemo, useState } from 'react'

import { request } from './session'
import { normalizeWhatsApp } from '@/lib/links'
import { panelHref } from '@/lib/panel'
import { cleanShows, SITE_SHOWS, type SiteShow, showPageTitles } from '@/lib/siteShows'
import type { SiteColors } from '@/lib/style-presets'
import { SITE_TYPES, type SiteType, templatePersonality } from '@/lib/templates'
import { type Personality, PERSONALITY_LABELS } from '@/lib/theme'
import type { Site, Template } from '@/payload-types'
import type { PuckPageData } from '@/puck/schema'
import { composeSiteTemplate } from '@/seed/templates/compose'

import { PanelDialog } from './PanelDialog'
import { PanelIcon } from './PanelIcon'
import { PersonalityPicker } from './PersonalityPicker'
import { Tip } from './Tip'
import { TemplatePreview, type TemplatePreviewData } from './TemplatePreview'
import { WhyDisabled } from './WhyDisabled'

export type StartTemplate = TemplatePreviewData & {
  key: string
  siteType: SiteType
}

/** A8: o que o site de hoje tem e pode sair do site novo. Só vem o que está preenchido. */
export type StartPrevious = {
  logo: string | null
  social: string[]
  contact: string | null
  seo: string | null
}

type ClearKey = keyof StartPrevious

/** As cores e as letras de hoje: com o logo ficando, o site montado continua com elas. */
export type StartBrand = { colors: SiteColors; fonts: NonNullable<Site['fonts']> }

type Props = {
  adminRoute: string
  apiRoute: string
  /** Páginas que o site já tem (no ar ou em rascunho). */
  existingPages: number
  /** Começar de novo: o nome, a frase e o WhatsApp das Configurações, e a cidade tirada do endereço. */
  initial: { name: string; tagline: string; whatsapp: string; city: string } | null
  /** As escolhas do último Começar (F1), já marcadas. */
  initialShows: SiteShow[]
  /** Delas, as que estão no ar: saem do ar ao trocar o site. */
  livePages: number
  previous: StartPrevious | null
  brand: StartBrand | null
  /** As Configurações têm mudança fora do ar: trocar o site descarta. */
  settingsDraft: boolean
  templates: StartTemplate[]
}

type Step = 'type' | 'basics' | 'shows' | 'look' | 'model' | 'review'

const STEP_NAMES: Record<Step, string> = {
  type: 'Tipo de site',
  basics: 'O negócio',
  shows: 'O que mostrar',
  look: 'Visual',
  model: 'Modelo',
  review: 'Revisar',
}

/**
 * Os passos deste caminho, cada nome embaixo da sua barra. No celular, os nomes não cabem: fica
 * só "Passo 5 de 5 · Revisar".
 */
function StepBar({ current, steps }: { current: Step; steps: Step[] }) {
  const position = steps.indexOf(current)
  const label = STEP_NAMES[current]
  return (
    <div className="gp-stepbar" style={{ '--gp-steps': steps.length } as React.CSSProperties}>
      <div aria-hidden="true" className="gp-steps">
        {steps.map((step, index) => (
          <span className={index <= position ? 'is-on' : undefined} key={step} />
        ))}
      </div>
      <ol
        aria-label={`Passos do início: agora, ${label} (${position + 1} de ${steps.length})`}
        className="gp-stepnames"
      >
        {steps.map((step, index) => (
          <li
            aria-current={index === position ? 'step' : undefined}
            className={index <= position ? 'is-on' : undefined}
            key={step}
          >
            {STEP_NAMES[step]}
          </li>
        ))}
      </ol>
      <p className="gp-stepnow">
        Passo {position + 1} de {steps.length} · {label}
      </p>
    </div>
  )
}

const NAME_LABEL: Partial<Record<SiteType, string>> = {
  pessoal: 'Seu nome',
  evento: 'Nome do evento',
}

type ChoiceOption<T extends string> = {
  value: T
  label: string
  text: string
  icon: React.ComponentProps<typeof PanelIcon>['name']
}

/** Cartões de escolha única (tipo de site), como o `typegrid` do protótipo. */
function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly ChoiceOption<T>[]
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

/** F1: cartões de marcar vários, com um ✓ nos marcados. */
function ShowChoices({
  value,
  onChange,
}: {
  value: SiteShow[]
  onChange: (value: SiteShow[]) => void
}) {
  const toggle = (show: SiteShow) =>
    onChange(cleanShows(value.includes(show) ? value.filter((s) => s !== show) : [...value, show]))
  return (
    <div aria-label="O que o site mostra" className="gp-typegrid gp-showgrid" role="group">
      {SITE_SHOWS.map((option) => {
        const on = value.includes(option.value)
        return (
          <button
            aria-checked={on}
            className="gp-typecard gp-showcard"
            key={option.value}
            onClick={() => toggle(option.value)}
            role="checkbox"
            type="button"
          >
            <span className="gp-typecard__icon">
              <PanelIcon name={option.icon} size={20} />
            </span>
            <span className="gp-showcard__text">
              <b>{option.label}</b>
              <span className="gp-small gp-muted">{option.text}</span>
            </span>
            <span aria-hidden="true" className="gp-showcard__check">
              {on && <PanelIcon name="check" size={16} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

const CLEAR_LABELS: Record<ClearKey, string> = {
  logo: 'Logo',
  social: 'Instagram e outras redes',
  contact: 'Endereço e telefone',
  seo: 'Descrição no Google',
}

/** Compara nomes sem diferença de maiúsculas, acentos e espaços. */
const sameName = (a: string, b: string) => {
  const plain = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase()
  return plain(a) === plain(b)
}

/** O modelo que o Começar monta (o mesmo do servidor), no formato da prévia. */
function composedPreview(
  shows: SiteShow[],
  personality: Personality,
  brand: StartBrand | null,
): StartTemplate {
  const template = composeSiteTemplate({ shows, personality })
  const home = template.pages[0]
  return {
    id: 0,
    key: template.key,
    siteType: 'institucional',
    name: 'Seu site',
    description: null,
    photos: [],
    forms: template.forms as Template['forms'],
    site: brand && template.site ? { ...template.site, ...brand } : template.site,
    header: template.header,
    footer: template.footer,
    home: { title: home.title, campaign: false, data: home.content.data as PuckPageData },
    pageTitles: template.pages.map((page) => page.title),
  }
}

export function StartWizard({
  adminRoute,
  apiRoute,
  brand,
  existingPages,
  initial,
  initialShows,
  livePages,
  previous,
  settingsDraft,
  templates,
}: Props) {
  const router = useRouter()
  const [type, setType] = useState<SiteType | null>(null)
  const [shows, setShows] = useState<SiteShow[]>(initialShows)
  const [personality, setPersonality] = useState<Personality>('classico')
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [tagline, setTagline] = useState(initial?.tagline ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [clearChoice, setClearChoice] = useState<Partial<Record<ClearKey, boolean>>>({})
  const [bigPreview, setBigPreview] = useState<StartTemplate | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sem tipo escolhido, a barra é a do site da empresa (o primeiro cartão).
  const composing = type === null || type === 'institucional'
  const steps: Step[] = composing
    ? ['type', 'basics', 'shows', 'look', 'review']
    : ['type', 'basics', 'model', 'review']
  const current = steps[step]
  const options = templates.filter((item) => item.siteType === type)
  const chosen = options.find((item) => item.id === templateId) ?? null
  const availableTypes = SITE_TYPES.filter(
    (item) => item.value === 'institucional' || templates.some((t) => t.siteType === item.value),
  )

  // A8: o que sai do site anterior. Com outro nome, é outro negócio: tudo já vem marcado.
  const nameChanged = Boolean(initial?.name) && !sameName(initial?.name ?? '', name)
  const clearKeys = (Object.keys(CLEAR_LABELS) as ClearKey[]).filter((key) => {
    const value = previous?.[key]
    return Array.isArray(value) ? value.length > 0 : Boolean(value)
  })
  const clear = Object.fromEntries(
    clearKeys.map((key) => [key, clearChoice[key] ?? nameChanged]),
  ) as Partial<Record<ClearKey, boolean>>
  const keepBrand = brand && !clear.logo ? brand : null

  const composed = useMemo(
    () => (composing ? composedPreview(shows, personality, keepBrand) : null),
    [composing, shows, personality, keepBrand],
  )
  const pageTitles = composing ? showPageTitles(shows) : (chosen?.pageTitles ?? [])
  const thumbColors = composed?.site?.colors ?? null

  const chooseType = (value: SiteType) => {
    setType(value)
    setTemplateId(templates.find((item) => item.siteType === value)?.id ?? null)
  }

  const whatsappInvalid = Boolean(whatsapp.trim()) && !normalizeWhatsApp(whatsapp)
  const canGo =
    (current === 'type' && Boolean(type)) ||
    (current === 'basics' && Boolean(name.trim()) && Boolean(city.trim()) && !whatsappInvalid) ||
    current === 'shows' ||
    current === 'look' ||
    (current === 'model' && Boolean(chosen)) ||
    (current === 'review' && (composing || Boolean(chosen)) && !busy)
  // O que falta para seguir, embaixo do botão desligado.
  const missing =
    canGo || busy
      ? null
      : current === 'model'
        ? 'Escolha um modelo para continuar'
        : current === 'type'
          ? 'Escolha uma opção para continuar'
          : !name.trim()
            ? 'Escreva o nome do negócio para continuar'
            : !city.trim()
              ? 'Escreva a cidade para continuar'
              : 'Confira o número do WhatsApp para continuar'

  const create = async () => {
    setBusy(true)
    setError(null)
    const answers = {
      name: name.trim(),
      city: city.trim(),
      tagline: tagline.trim(),
      whatsapp: whatsapp.trim(),
      clear,
    }
    try {
      const { missingPhotos } = await request<{ missingPhotos: number }>(
        apiRoute,
        composing ? '/templates/montar' : `/templates/${chosen!.id}/aplicar`,
        {
          method: 'POST',
          body: JSON.stringify(composing ? { ...answers, shows, personality } : answers),
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
    if (step < steps.length - 1) {
      setStep(step + 1)
      window.scrollTo({ top: 0 })
    } else void create()
  }

  // O que o modelo sugere para o tipo. Só a personalidade: o nome das letras não diz nada para
  // quem não é do ramo; as letras aparecem na própria prévia.
  const lookNote = (template: StartTemplate) => {
    const look = templatePersonality(template.key)
    return look ? `Visual ${PERSONALITY_LABELS[look].name}` : ''
  }

  const pagesNote = (template: StartTemplate) =>
    template.pageTitles.length > 1
      ? `Todos já vêm com ${template.pageTitles.length} páginas: ${template.pageTitles.join(', ')}.`
      : 'Todos são uma página só, já montada.'

  const lastLabel = busy
    ? 'Montando seu site…'
    : existingPages > 0
      ? 'Trocar meu site'
      : 'Criar meu site'

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

          {current === 'basics' && (
            <>
              <h1>Agora, o básico</h1>
              <p className="gp-muted">
                Usamos esses dados no topo da página, no rodapé, no Google e nos textos de exemplo.
                Dá para mudar tudo depois.
              </p>
              <div className="gp-field">
                <label htmlFor="ob-name">{(type && NAME_LABEL[type]) || 'Nome do negócio'}</label>
                <input
                  className="gp-input"
                  id="ob-name"
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={chosen?.site?.name ? `Ex.: ${chosen.site.name}` : undefined}
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
                  Entra nos textos de exemplo, como “Atendemos em Uberlândia”. Se atende só pela
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
                  placeholder={chosen?.site?.tagline ? `Ex.: ${chosen.site.tagline}` : undefined}
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

          {current === 'shows' && (
            <>
              <h1>O que o seu site precisa mostrar?</h1>
              <p className="gp-muted">
                Marque quantos quiser. Cada escolha vira uma página, já com a seção certa e um
                atalho na página inicial.
              </p>
              <ShowChoices onChange={setShows} value={shows} />
              <div aria-live="polite" className="gp-showpages">
                <b>
                  {pageTitles.length > 1
                    ? `Vamos criar ${pageTitles.length} páginas:`
                    : 'Vamos criar 1 página:'}
                </b>
                <ul>
                  {pageTitles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
                {!shows.length && (
                  <span className="gp-small gp-muted">
                    Sem nada marcado, o site fica com uma página só, com Sobre e Contato nela.
                  </span>
                )}
              </div>
            </>
          )}

          {current === 'look' && composed && thumbColors && (
            <>
              <h1>Escolha o visual</h1>
              <p className="gp-muted">
                {keepBrand
                  ? 'As cores e as letras continuam as da sua marca. Toque num visual para ver o seu site nele.'
                  : 'As cores são um ponto de partida: em Sua marca, você troca pelas do seu logo. Toque num visual para ver o seu site nele.'}
              </p>
              <PersonalityPicker
                colors={thumbColors}
                onChange={setPersonality}
                previewNote="É o seu site, com o nome e as páginas que você escolheu."
                renderPreview={(look, device) => (
                  <TemplatePreview
                    city={city}
                    name={name}
                    template={composedPreview(shows, look, keepBrand)}
                    width={device === 'phone' ? 390 : 1100}
                  />
                )}
                value={personality}
              />
              <div className="gp-tplsite is-on">
                <div className="gp-tplsite__preview">
                  <TemplatePreview city={city} name={name} template={composed} />
                </div>
                <div className="gp-tplsite__meta">
                  <div>
                    <b>Visual {PERSONALITY_LABELS[personality].name}</b>
                    <span className="gp-small gp-muted">
                      A página inicial, com textos de exemplo para você trocar.
                    </span>
                  </div>
                  <button
                    className="gp-btn gp-btn--sm"
                    onClick={() => setBigPreview(composed)}
                    type="button"
                  >
                    <PanelIcon name="eye" size={14} />
                    Ver maior
                  </button>
                </div>
              </div>
            </>
          )}

          {current === 'model' && (
            <>
              <h1>Escolha um modelo</h1>
              <p className="gp-muted">
                {options[0] && pagesNote(options[0])} Os textos são exemplos, já com o nome e a
                cidade que você escreveu: troque pelos seus. As fotos ficam para você escolher.
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
              <Tip>
                O visual, as cores e as letras do modelo são sugestões. Em Sua marca você escolhe
                quaisquer outras.
              </Tip>
            </>
          )}

          {current === 'review' && (
            <>
              <h1>{existingPages > 0 ? 'Confira antes de trocar' : 'Confira antes de criar'}</h1>
              <dl className="gp-review">
                <div>
                  <dt>{(type && NAME_LABEL[type]) || 'Nome do negócio'}</dt>
                  <dd>{name.trim()}</dd>
                </div>
                <div>
                  <dt>Cidade</dt>
                  <dd>{city.trim()}</dd>
                </div>
                {tagline.trim() && (
                  <div className="gp-review__wide">
                    <dt>Frase</dt>
                    <dd>{tagline.trim()}</dd>
                  </div>
                )}
                {whatsapp.trim() && (
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>{whatsapp.trim()}</dd>
                  </div>
                )}
                <div>
                  <dt>{composing ? 'Visual' : 'Modelo'}</dt>
                  <dd>{composing ? PERSONALITY_LABELS[personality].name : (chosen?.name ?? '')}</dd>
                </div>
                <div className="gp-review__wide">
                  <dt>
                    {pageTitles.length > 1 ? `${pageTitles.length} páginas novas` : '1 página nova'}
                  </dt>
                  <dd>{pageTitles.join(', ')}</dd>
                </div>
              </dl>

              {existingPages > 0 && (
                <div className="gp-warnbox" role="note">
                  <b>
                    {livePages === 0
                      ? 'Nenhuma página do seu site está no ar hoje.'
                      : livePages === 1
                        ? 'A página que está no ar hoje sai do ar.'
                        : `As ${livePages} páginas que estão no ar hoje saem do ar.`}
                  </b>
                  <span>
                    O menu, o rodapé e as páginas passam a ser os do site novo. O e-mail que recebe
                    as mensagens continua o mesmo.
                  </span>
                  {settingsDraft && (
                    <span>
                      As mudanças das Configurações que ainda não foram publicadas serão
                      descartadas.
                    </span>
                  )}
                </div>
              )}

              {existingPages > 0 && clearKeys.length > 0 && (
                <fieldset className="gp-clearlist">
                  <legend>O que sai do site anterior?</legend>
                  <span className="gp-hint">
                    {nameChanged
                      ? 'O nome mudou, então tudo já vem marcado. Desmarque o que continua valendo.'
                      : 'Marque o que não vale mais para o site novo. O que ficar desmarcado continua.'}
                  </span>
                  {clearKeys.map((key) => {
                    const value = previous?.[key]
                    const detail = Array.isArray(value) ? value.join(', ') : value
                    return (
                      <label className="gp-clearlist__item" key={key}>
                        <input
                          checked={Boolean(clear[key])}
                          onChange={(event) =>
                            setClearChoice({ ...clearChoice, [key]: event.target.checked })
                          }
                          type="checkbox"
                        />
                        <span>
                          <b>{CLEAR_LABELS[key]}</b>
                          <span className="gp-small gp-muted gp-clearlist__detail">{detail}</span>
                        </span>
                      </label>
                    )
                  })}
                </fieldset>
              )}

              {existingPages > 0 && (
                <p className="gp-backupnote">
                  <PanelIcon name="check" size={16} />
                  <span>
                    O site anterior fica guardado em Páginas › Arquivadas. Dá para voltar a qualquer
                    momento.
                  </span>
                </p>
              )}

              {error && (
                <p className="gp-error" role="alert">
                  Não deu para criar o site: {error}
                </p>
              )}
            </>
          )}

          {busy && (
            <p aria-live="polite" className="gp-small gp-muted">
              Criando as páginas, o menu e os formulários. Leva alguns segundos.
            </p>
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
                {current === 'review' ? lastLabel : 'Continuar'}
              </button>
              <WhyDisabled id="ob-why" reason={missing} />
            </div>
          </div>
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
        <PanelDialog
          onClose={() => setBigPreview(null)}
          title={bigPreview.id ? `Modelo ${bigPreview.name}` : 'Seu site'}
          wide
        >
          <p className="gp-small gp-muted">
            {bigPreview.pageTitles.length > 1 ? 'Página inicial' : 'A página'} com textos de
            exemplo. O desenho no lugar das fotos mostra onde vão as suas.
          </p>
          <div className="gp-bigprev">
            <TemplatePreview city={city} name={name} template={bigPreview} />
          </div>
          <div className="gp-actions gp-actions--end">
            {bigPreview.id ? (
              <>
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
              </>
            ) : (
              <button
                className="gp-btn gp-btn--primary"
                onClick={() => setBigPreview(null)}
                type="button"
              >
                Fechar
              </button>
            )}
          </div>
        </PanelDialog>
      )}
    </div>
  )
}
