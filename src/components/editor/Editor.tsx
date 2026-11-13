'use client'

import '@puckeditor/core/no-external.css'
import '@/app/(frontend)/styles.css'
import './editor.css'

import {
  blocksPlugin,
  type Data,
  fieldsPlugin,
  Puck,
  type PuckAction,
  type Plugin,
  useGetPuck,
  type UiState,
} from '@puckeditor/core'
import { toast } from '@payloadcms/ui'
import Link from 'next/link'
import React, {
  type CSSProperties,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { saveSitePersonality } from '@/components/panel/api'
import { PanelIcon } from '@/components/panel/PanelIcon'
import { PERSONALITY_TOKENS } from '@/components/site/theme'
import type { FormDefinition } from '@/lib/forms'
import { findExampleSections } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import { type Personality, PERSONALITY_LABELS, safePersonality } from '@/lib/theme'
import type { Media } from '@/payload-types'
import { editorConfig } from '@/puck/editor-config'
import { type ContentMetadata, mainHeadingID, type SiteInfo } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent, type PuckPageData } from '@/puck/schema'
import { extractDescription, googleTitle } from '@/puck/seo'

import {
  latestPageVersion,
  OFFLINE,
  publishPage,
  RequestError,
  saveDraft,
  stillLoggedIn,
} from './api'
import { type EditorPageSummary, EditorProvider } from './context'
import { CountedField } from './CountedField'
import { dictionary } from './dictionary'
import { Dialog } from './Dialog'
import { createDraftSaver } from './draftSaver'
import { clearLocalCopy, type LocalCopy, readLocalCopy, writeLocalCopy } from './localCopy'
import { EditorFrame, FrameStyleProvider } from './EditorFrame'
import { scrollToSection } from './insert'
import { OrderPanel } from './OrderPanel'
import { type PageSettings, PageSettingsDialog } from './PageSettingsDialog'
import { PersonalitySwitch } from './PersonalitySwitch'
import { PhotoPicker } from './PhotoPicker'
import { PreviewTools } from './PreviewTools'
import { PublishDialog } from './PublishDialog'
import { type GetPuck, ROOT_ZONE, usePuck } from './puck'
import { describeSaveError, type FieldsByType, type SaveTarget } from './saveErrors'
import { EditorActionBar, SectionActionsPanel } from './SectionActions'
import { EditorDrawer, EditorDrawerItem } from './SectionList'
import { type SiteChrome, SitePreviewProvider } from './SitePreview'
import { VersionsDialog } from './VersionsDialog'
import { layoutProblem } from './zoneLimits'

export type EditorProps = {
  apiRoute: string
  adminRoute: string
  page: PageSettings & { id: number; live: boolean; hasChanges: boolean; updatedAt: string }
  initialData: PuckPageData
  photos: Media[]
  forms: FormDefinition[]
  pages: EditorPageSummary[]
  homepageId: number | null
  site: SiteInfo
  /** Frase de apresentação: entra no título da página inicial no Google. */
  tagline: string | null
  domain: string
  /** Textos dos modelos: seção que ainda tem um deles aparece como texto de exemplo. */
  exampleTexts: string[]
  whatsappHref: string | null
  theme: Record<string, string>
  fontFaces: string | null
  chrome: SiteChrome
}

type SaveState =
  | { state: 'saved'; at?: Date }
  | { state: 'pending' | 'saving' }
  /** Sem internet: tenta de novo sozinho, e de novo quando a conexão volta. */
  | { state: 'offline' }
  /** `target`: onde está o problema, para o "Ir até o campo". */
  | { state: 'error'; message: string; target?: SaveTarget }

type DialogName = 'publish' | 'versions' | 'settings' | 'more' | null

const SAVE_DELAY = 1200
/** Sem internet, tenta salvar de novo depois de 3 s, 6 s, 12 s… até de 30 em 30 s. */
const RETRY_FIRST = 3000
const RETRY_MAX = 30000
/** O Puck guarda o passo no Desfazer 250 ms depois da mudança: o conserto espera ele. */
const HISTORY_SETTLE = 320
const UI_ONLY_ACTIONS: readonly string[] = ['setUi', 'registerZone', 'unregisterZone']

// Prévia: começa ocupando o espaço que sobra; fora do celular, o PreviewTools passa a desenhar a
// página com a largura de um computador. Sem os controles de zoom do Puck.
const initialUi: Partial<UiState> = {
  viewports: { current: { width: '100%', height: 'auto' }, controlsVisible: false, options: [] },
}

// Barra de ícones: o Puck escreve o nome como veio, por isso dá para esconder a palavra no celular.
const plugins: Plugin[] = [
  blocksPlugin({
    icon: <PanelIcon name="plus" size={20} />,
    label: (
      <>
        Adicionar<span className="ed-hide-phone"> seção</span>
      </>
    ) as unknown as string,
  }),
  {
    name: 'outline',
    label: 'Ordem',
    icon: <PanelIcon name="layers" size={20} />,
    render: OrderPanel,
  },
  fieldsPlugin({ icon: <PanelIcon name="sliders" size={20} />, label: 'Opções' }),
]

// Campos de texto com o contador de letras embaixo (o limite vem do formato da página).
const countedFields = {
  text: CountedField,
  textarea: CountedField,
  richtext: CountedField,
} as unknown as NonNullable<Parameters<typeof Puck>[0]['overrides']>['fieldTypes']

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const FIELDS = editorConfig.components as unknown as FieldsByType

/** Controles da barra de cima, que fica dentro do Puck (override do cabeçalho). */
type Chrome = {
  title: string
  status: string
  /** O estado numa palavra, para o celular: "Salvo", "Falta publicar", "Sem internet". */
  statusShort: string
  statusTone: 'ok' | 'warn' | 'muted'
  /** O que impede de salvar, com o "Ir até o campo" quando dá para saber onde. */
  saveAlert: { message: string; canGo: boolean } | null
  goToProblem: () => void
  canPublish: boolean
  livePath: string | null
  backHref: string
  /** Resumo que aparece no painel da direita quando nenhuma seção está escolhida. */
  summary: { sections: number; address: string; exampleSections: number }
  /** Escolhe a próxima seção que ainda tem texto de exemplo e rola até ela. */
  goToExample: () => void
  open: (dialog: DialogName) => void
  /** Salva o que falta antes de sair. `false`: sobrou mudança sem salvar, e a janela já pergunta. */
  leave: () => Promise<boolean>
  /** Abre o menu do celular, sabendo se dá para desfazer e refazer. */
  openMore: (history: { canUndo: boolean; canRedo: boolean }) => void
  /** A barra roda dentro do Puck: entrega o acesso a ele para o resto do editor. */
  connect: (getPuck: GetPuck) => void
  /** Personalidade do site (rascunho das configurações), trocável daqui. */
  personality: Personality
  changePersonality: (value: Personality) => void
}

const ChromeContext = createContext<Chrome | null>(null)

function EditorHeader() {
  const chrome = useContext(ChromeContext)
  const history = usePuck((state) => state.history)
  const getPuck = useGetPuck()
  const connect = chrome?.connect
  useEffect(() => connect?.(getPuck), [connect, getPuck])
  if (!chrome) return <></>

  return (
    <header className="ed-top">
      <Link
        aria-label="Voltar para as páginas"
        className="ed-icon-btn"
        href={chrome.backHref}
        onClick={async (event) => {
          event.preventDefault()
          if (await chrome.leave()) window.location.href = chrome.backHref
        }}
        title="Voltar para as páginas"
      >
        <PanelIcon name="back" />
      </Link>
      <div className="ed-top__title">
        <b>{chrome.title}</b>
        {/* No celular, o estado numa palavra com um ponto de cor; o texto inteiro fica no
            nome acessível e aparece ao tocar. */}
        <span
          aria-label={chrome.status}
          className={`ed-top__status ed-top__status--${chrome.statusTone}`}
          role="status"
          tabIndex={0}
          title={chrome.status}
        >
          <span aria-hidden="true" className="ed-top__status-long">
            {chrome.status}
          </span>
          <span aria-hidden="true" className="ed-top__status-short">
            <i className="ed-dot" />
            {chrome.statusShort}
          </span>
        </span>
      </div>
      <PersonalitySwitch
        className="ed-hide-sm"
        onChange={chrome.changePersonality}
        value={chrome.personality}
      />
      <div className="ed-top__actions">
        <button
          aria-label="Desfazer"
          className="ed-icon-btn ed-hide-sm"
          disabled={!history.hasPast}
          onClick={history.back}
          title="Desfazer"
          type="button"
        >
          <PanelIcon name="undo" />
        </button>
        <button
          aria-label="Refazer"
          className="ed-icon-btn ed-hide-sm"
          disabled={!history.hasFuture}
          onClick={history.forward}
          title="Refazer"
          type="button"
        >
          <PanelIcon name="redo" />
        </button>
        <button className="ed-btn ed-hide-sm" onClick={() => chrome.open('versions')} type="button">
          Versões
        </button>
        <button className="ed-btn ed-hide-sm" onClick={() => chrome.open('settings')} type="button">
          Página e Google
        </button>
        {chrome.livePath && (
          <a className="ed-btn ed-hide-sm" href={chrome.livePath} rel="noopener" target="_blank">
            Ver no site
          </a>
        )}
        {/* Sem nada para publicar, vira um aviso legível ("Publicada", com o visto), não um botão
            apagado. */}
        <button
          className={`ed-btn ed-btn--primary${chrome.canPublish ? '' : ' ed-btn--done'}`}
          disabled={!chrome.canPublish}
          onClick={() => chrome.open('publish')}
          type="button"
        >
          {chrome.canPublish ? (
            'Publicar'
          ) : (
            <>
              <PanelIcon name="check" size={16} />
              Publicada
            </>
          )}
        </button>
        <button
          aria-label="Mais opções do editor"
          className="ed-icon-btn ed-show-sm"
          onClick={() => chrome.openMore({ canUndo: history.hasPast, canRedo: history.hasFuture })}
          title="Mais opções"
          type="button"
        >
          <PanelIcon name="more" />
        </button>
      </div>
      <PreviewTools />
      {chrome.saveAlert && (
        <div className="ed-save-alert" role="alert">
          <PanelIcon name="alert" size={18} />
          <span>{chrome.saveAlert.message}</span>
          {chrome.saveAlert.canGo && (
            <button className="ed-btn ed-btn--sm" onClick={chrome.goToProblem} type="button">
              Ir até o campo
            </button>
          )}
        </div>
      )}
    </header>
  )
}

/** Painel da direita (override do Puck): sem seção escolhida, o resumo da página. */
function EditorFields({
  children,
  itemSelector,
}: {
  children: React.ReactNode
  itemSelector?: unknown
}) {
  const chrome = useContext(ChromeContext)
  if (itemSelector || !chrome) {
    return (
      <>
        {children}
        <SectionActionsPanel />
      </>
    )
  }
  const { sections, address, exampleSections } = chrome.summary

  return (
    <>
      <div className="ed-summary">
        <b>Esta página</b>
        <span className="ed-hint">{sections === 1 ? '1 seção' : `${sections} seções`}</span>
        {/* O endereço numa linha só dele, que quebra antes da barra (nunca no meio do domínio). */}
        <span className="ed-hint ed-summary__address">
          <span>{address.split('/')[0]}</span>
          {address.includes('/') && (
            <>
              <wbr />
              <span>/{address.split('/').slice(1).join('/')}</span>
            </>
          )}
        </span>
        {exampleSections > 0 && (
          <button className="ed-linkbtn ed-hint--warn" onClick={chrome.goToExample} type="button">
            {exampleSections === 1
              ? '1 seção ainda tem texto de exemplo. Ver qual'
              : `${exampleSections} seções ainda têm texto de exemplo. Ver a próxima`}
          </button>
        )}
      </div>
      {children}
    </>
  )
}

export function Editor(props: EditorProps) {
  const { apiRoute, adminRoute, initialData, homepageId, site, tagline, whatsappHref } = props
  const pageId = props.page.id

  const [settings, setSettings] = useState<PageSettings>({
    title: props.page.title,
    slug: props.page.slug,
    campaign: props.page.campaign,
    seo: props.page.seo,
  })
  const [live, setLive] = useState(props.page.live)
  const [hasChanges, setHasChanges] = useState(props.page.hasChanges)
  const [save, setSave] = useState<SaveState>({ state: 'saved' })
  const [dialog, setDialog] = useState<DialogName>(null)
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false })
  const [conflict, setConflict] = useState(false)
  // Voltar com mudança que não foi salva: a janela explica antes de sair.
  const [leaving, setLeaving] = useState<{ since: Date | null } | null>(null)
  // Cópia guardada no aparelho numa visita anterior, que não chegou a ser salva.
  const [recovery, setRecovery] = useState<LocalCopy | null>(null)
  const [photos, setPhotos] = useState(props.photos)
  const [forms, setForms] = useState(props.forms)
  const [picking, setPicking] = useState<((photo: Media) => void) | null>(null)
  const [data, setData] = useState<PuckPageData>(initialData)
  const [personality, setPersonality] = useState<Personality>(() =>
    safePersonality(props.theme['--personality']),
  )

  const latest = useRef<PuckPageData>(initialData)
  const lastSaved = useRef(JSON.stringify(initialData))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saving = useRef<Promise<void>>(Promise.resolve())
  // Versão em que este editor está trabalhando: a que abriu e, depois, a de cada salvamento dele.
  const baseUpdatedAt = useRef(props.page.updatedAt)
  const stopped = useRef(false)
  // Sem internet: quando tentar de novo, e quanto esperar na próxima vez.
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryDelay = useRef(RETRY_FIRST)
  // Saindo de propósito (Sair mesmo assim, sessão encerrada): o navegador não pergunta de novo.
  const exiting = useRef(false)
  // Desde quando há mudança na tela que ainda não foi salva.
  const unsavedSince = useRef<Date | null>(null)
  // Acesso ao Puck para quem está fora dele (voltar versão, desfazer peça solta).
  const getPuck = useRef<GetPuck | null>(null)
  const exampleCursor = useRef(0)
  const removedToast = useRef<string | number | null>(null)
  const connect = useCallback((value: GetPuck) => {
    getPuck.current = value
  }, [])

  const formById = useMemo(
    () =>
      Object.fromEntries(forms.map((form) => [form.id, form])) as Record<number, FormDefinition>,
    [forms],
  )
  const addForm = useCallback(
    (form: FormDefinition) =>
      setForms((current) => [...current.filter((item) => item.id !== form.id), form]),
    [],
  )

  const photoById = useMemo(
    () => Object.fromEntries(photos.map((photo) => [photo.id, photo])) as Record<number, Media>,
    [photos],
  )

  const addPhoto = useCallback(
    (photo: Media) =>
      setPhotos((current) => [photo, ...current.filter((item) => item.id !== photo.id)]),
    [],
  )

  // Um envio por vez: cada um sai com a data que o anterior devolveu, senão o editor se acusaria
  // de conflito com o próprio salvamento.
  const send = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = saving.current.then(task)
    saving.current = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }, [])

  // A página mudou em outro lugar: para de salvar aqui até a pessoa recarregar.
  const stopIfConflict = useCallback((caught: unknown) => {
    if (!(caught instanceof RequestError) || caught.status !== 409) return false
    stopped.current = true
    setConflict(true)
    setDialog(null)
    return true
  }, [])

  const isDirty = useCallback(() => JSON.stringify(latest.current) !== lastSaved.current, [])

  // A sessão acabou (Sair em outra aba, senha trocada): guarda a mudança no aparelho e vai para
  // "Você saiu por segurança", que traz de volta para cá ao entrar de novo.
  const endSession = useCallback(() => {
    writeLocalCopy(pageId, latest.current)
    exiting.current = true
    const back = `${window.location.pathname}${window.location.search}`
    const target = new URL(`${adminRoute}/logout-inactivity`, window.location.origin)
    target.searchParams.set('redirect', back)
    window.location.href = target.href
  }, [adminRoute, pageId])

  // A nova tentativa sem internet chama o próprio salvar, que ainda está sendo criado aqui.
  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Salva o que está na tela, se mudou desde o último salvamento.
  const flush = useCallback((): Promise<void> => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = null
    return send(async () => {
      if (stopped.current) return
      const current = latest.current
      const json = JSON.stringify(current)
      if (json === lastSaved.current) return
      const parsed = parsePageContent({ version: CONTENT_VERSION, data: current })
      if (!parsed.success) {
        writeLocalCopy(pageId, current)
        const problem = describeSaveError(parsed.error, current, FIELDS)
        return setSave({ state: 'error', message: problem.message, target: problem.target })
      }
      setSave({ state: 'saving' })
      try {
        const { doc } = await saveDraft(
          apiRoute,
          pageId,
          { content: parsed.data },
          baseUpdatedAt.current,
        )
        baseUpdatedAt.current = doc.updatedAt
        lastSaved.current = json
        retryDelay.current = RETRY_FIRST
        setHasChanges(true)
        if (JSON.stringify(latest.current) === json) {
          unsavedSince.current = null
          clearLocalCopy(pageId)
          setSave({ state: 'saved', at: new Date() })
        } else {
          setSave({ state: 'pending' })
        }
      } catch (caught) {
        writeLocalCopy(pageId, current)
        if (stopIfConflict(caught)) return
        const status = caught instanceof RequestError ? caught.status : null
        if (status === OFFLINE) {
          setSave({ state: 'offline' })
          // Tenta de novo sozinho, cada vez esperando mais (e já na volta da conexão).
          retryTimer.current = setTimeout(() => void flushRef.current(), retryDelay.current)
          retryDelay.current = Math.min(retryDelay.current * 2, RETRY_MAX)
          return
        }
        if (status === 401 || status === 403) {
          const loggedIn = await stillLoggedIn(apiRoute).catch(() => true)
          if (!loggedIn) return endSession()
        }
        setSave({
          state: 'error',
          message: caught instanceof Error ? caught.message : 'sem conexão com o servidor',
        })
      }
    })
  }, [apiRoute, endSession, pageId, send, stopIfConflict])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  // A conexão voltou: salva na hora o que estava esperando.
  useEffect(() => {
    const online = () => {
      retryDelay.current = RETRY_FIRST
      void flush()
    }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [flush])

  const onChange = useCallback(
    (next: Data) => {
      const puckData = next as PuckPageData
      latest.current = puckData
      setData(puckData)
      if (JSON.stringify(puckData) === lastSaved.current) return
      unsavedSince.current ??= new Date()
      setSave({ state: 'pending' })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), SAVE_DELAY)
    },
    [flush],
  )

  // Fechar a aba com mudança ainda não salva: o navegador pergunta antes, e uma cópia fica no
  // aparelho para o caso de a pessoa fechar mesmo assim.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (exiting.current || !isDirty()) return
      writeLocalCopy(pageId, latest.current)
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty, pageId])

  // Uma visita anterior deixou mudança sem salvar neste aparelho: oferece recuperar.
  useEffect(() => {
    const copy = readLocalCopy(pageId)
    if (!copy) return
    if (JSON.stringify(copy.data) === JSON.stringify(initialData)) clearLocalCopy(pageId)
    // O aparelho só existe no navegador: a pergunta aparece depois de abrir, não no servidor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else setRecovery(copy)
    // Só ao abrir: depois, a cópia é deste editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O indicador de carregamento do Puck é um `<span aria-label>` sem papel (axe
  // aria-prohibited-attr) e não tem override: ganha `role="status"` assim que aparece.
  useEffect(() => {
    const root = document.querySelector('.ed-root')
    if (!root) return
    const fix = () => {
      for (const loader of root.querySelectorAll('[class*="Loader"][aria-label]:not([role])')) {
        loader.setAttribute('role', 'status')
      }
    }
    fix()
    const observer = new MutationObserver(fix)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  /**
   * Uma mudança que deixaria a página sem salvar (peça solta fora das Colunas, coluna com mais de 6
   * peças, página com mais de 100 seções) é desfeita na hora. Sai também do Desfazer: o Puck guarda
   * o passo um instante depois, e o conserto tira esse passo, para o Desfazer não trazer o erro de
   * volta.
   */
  const undoBadChange = useCallback((message: string, previous: Data) => {
    setTimeout(() => {
      const puck = getPuck.current?.()
      if (!puck) return
      const { histories, index, setHistories } = puck.history
      const recorded = histories[index]?.state.data as Data | undefined
      if (index > 0 && recorded && layoutProblem(recorded)) {
        setHistories(histories.slice(0, index))
      } else if (layoutProblem(puck.appState.data)) {
        puck.dispatch({ type: 'setData', data: previous, recordHistory: false })
      }
      toast.info(message)
    }, HISTORY_SETTLE)
  }, [])

  const onAction = useCallback(
    (action: PuckAction, next: { data: Data }, previous: { data: Data }) => {
      // O Desfazer do aviso volta a última mudança: depois de outra, ela já não seria a remoção.
      if (!UI_ONLY_ACTIONS.includes(action.type) && removedToast.current !== null) {
        toast.dismiss(removedToast.current)
        removedToast.current = null
      }
      if (action.type === 'remove') {
        const message = action.zone === ROOT_ZONE ? 'Seção removida.' : 'Peça removida.'
        // O Puck deixaria a seção de baixo escolhida, e a pessoa não pediu para mexer nela.
        setTimeout(() => {
          const puck = getPuck.current?.()
          puck?.dispatch({ type: 'setUi', ui: { itemSelector: null }, recordHistory: false })
          removedToast.current = toast.info(message, {
            action: { label: 'Desfazer', onClick: () => getPuck.current?.().history.back() },
          })
        })
        return
      }
      if (UI_ONLY_ACTIONS.includes(action.type)) return
      const problem = layoutProblem(next.data)
      if (problem && !layoutProblem(previous.data)) undoBadChange(problem, previous.data)
    },
    [undoBadChange],
  )

  // Conflito: a pessoa escolheu a versão desta tela. Ela passa a ser a mais nova, por cima da
  // outra (que continua nas Versões, se tinha sido publicada).
  const keepMine = useCallback(async () => {
    try {
      baseUpdatedAt.current = await latestPageVersion(apiRoute, pageId)
    } catch {
      return toast.error('Não deu para falar com o servidor. Confira a internet e tente de novo.')
    }
    stopped.current = false
    setConflict(false)
    lastSaved.current = ''
    await flush()
  }, [apiRoute, flush, pageId])

  const publish = useCallback(async () => {
    await flush()
    await send(async () => {
      if (stopped.current) throw new Error('a página mudou em outro lugar')
      // Guardado antes do envio: o que mudar enquanto publica continua contando como não salvo.
      const json = JSON.stringify(latest.current)
      const parsed = parsePageContent({ version: CONTENT_VERSION, data: latest.current })
      if (!parsed.success) {
        throw new Error(describeSaveError(parsed.error, latest.current, FIELDS).message)
      }
      try {
        const { doc } = await publishPage(apiRoute, pageId, parsed.data, baseUpdatedAt.current)
        baseUpdatedAt.current = doc.updatedAt
      } catch (caught) {
        stopIfConflict(caught)
        throw caught
      }
      lastSaved.current = json
      setLive(true)
      const changedMeanwhile = JSON.stringify(latest.current) !== json
      setHasChanges(changedMeanwhile)
      setSave(changedMeanwhile ? { state: 'pending' } : { state: 'saved', at: new Date() })
      if (changedMeanwhile) void flush()
    })
  }, [apiRoute, flush, pageId, send, stopIfConflict])

  const saveSettings = useCallback(
    (next: PageSettings) =>
      send(async () => {
        if (stopped.current) throw new Error('a página mudou em outro lugar')
        try {
          const { doc } = await saveDraft(apiRoute, pageId, next, baseUpdatedAt.current)
          baseUpdatedAt.current = doc.updatedAt
        } catch (caught) {
          stopIfConflict(caught)
          throw caught
        }
        setSettings(next)
        setHasChanges(true)
      }),
    [apiRoute, pageId, send, stopIfConflict],
  )

  const isHome = pageId === homepageId
  const path = isHome ? '/' : `/${settings.slug}`
  const unsaved = save.state !== 'saved'
  const savedAt = save.state === 'saved' ? save.at : undefined

  const knownTexts = props.exampleTexts
  const exampleSections = useMemo(() => findExampleSections(data, knownTexts), [data, knownTexts])
  const googleSite = { name: site.name, tagline }

  const status = conflict
    ? 'Salvamento parado: a página mudou em outro lugar'
    : save.state === 'saving' || save.state === 'pending'
      ? 'Salvando…'
      : save.state === 'offline'
        ? 'Sem internet. As mudanças ficam guardadas aqui e são salvas quando a conexão voltar.'
        : save.state === 'error'
          ? `Não deu para salvar: ${save.message}`
          : live && !hasChanges
            ? 'Tudo no ar'
            : `Guardado${savedAt ? ` às ${timeFormat.format(savedAt)}` : ''}, falta publicar${
                live ? '' : ' · rascunho, ainda não está no ar'
              }`
  const statusShort = conflict
    ? 'Parado'
    : save.state === 'saving' || save.state === 'pending'
      ? 'Salvando…'
      : save.state === 'offline'
        ? 'Sem internet'
        : save.state === 'error'
          ? 'Não salvou'
          : live && !hasChanges
            ? 'Tudo no ar'
            : 'Falta publicar'
  const problemTarget = save.state === 'error' ? save.target : undefined

  // Troca a personalidade na prévia na hora; guarda no rascunho das configurações um pouco depois
  // da última troca, um pedido por vez (as setas do teclado trocam a cada toque). Só o último pedido
  // avisa; se ele falhar, a tela volta para a última personalidade que chegou a ser guardada.
  const personalitySaver = useMemo(
    () =>
      createDraftSaver<Personality>({
        initial: safePersonality(props.theme['--personality']),
        save: (value) => saveSitePersonality(apiRoute, value),
        onSaved: (value) =>
          toast.success(
            `Personalidade ${PERSONALITY_LABELS[value].name} guardada. O site muda quando você publicar em Sua marca.`,
          ),
        onFailed: (lastSaved) => {
          setPersonality(lastSaved)
          toast.error('Não deu para trocar a personalidade. Confira a internet e tente de novo.')
        },
      }),
    // Uma fila só durante o editor aberto: o tema inicial vem do servidor uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRoute],
  )
  useEffect(() => () => personalitySaver.dispose(), [personalitySaver])
  const changePersonality = useCallback(
    (next: Personality) => {
      setPersonality(next)
      personalitySaver.change(next)
    },
    [personalitySaver],
  )

  const chrome: Chrome = {
    title: settings.title,
    status,
    statusShort,
    statusTone:
      conflict || save.state === 'error' || save.state === 'offline'
        ? 'warn'
        : live && !hasChanges
          ? 'ok'
          : 'muted',
    saveAlert:
      save.state === 'error' ? { message: save.message, canGo: Boolean(problemTarget) } : null,
    goToProblem: () => {
      const puck = getPuck.current?.()
      if (!puck || !problemTarget) return
      puck.dispatch({
        type: 'setUi',
        ui: {
          itemSelector: { index: problemTarget.index, zone: problemTarget.zone },
          rightSideBarVisible: true,
        },
        recordHistory: false,
      })
      scrollToSection(problemTarget.id)
      // Com o painel já desenhado, o cursor vai para o campo (se ele estiver aberto na tela).
      setTimeout(() => {
        const field = problemTarget.field
        if (!field) return
        const input = document.querySelector<HTMLElement>(
          `form[class*="_PuckFields_"] [name="${CSS.escape(field)}"]`,
        )
        input?.scrollIntoView({ block: 'center' })
        input?.focus()
      }, 300)
    },
    canPublish: !live || hasChanges || unsaved,
    livePath: live ? path : null,
    backHref: panelHref(adminRoute, 'pages'),
    summary: {
      sections: data.content.length,
      address: `${props.domain}${path === '/' ? '' : path}`,
      exampleSections: exampleSections.length,
    },
    goToExample: () => {
      const puck = getPuck.current?.()
      if (!puck || !exampleSections.length) return
      // A cada clique, a próxima da lista (volta à primeira depois da última).
      const next = exampleSections[exampleCursor.current % exampleSections.length]
      exampleCursor.current += 1
      const index = puck.appState.data.content.findIndex((item) => item.props.id === next.props.id)
      if (index < 0) return
      puck.dispatch({
        type: 'setUi',
        ui: { itemSelector: { index, zone: ROOT_ZONE }, rightSideBarVisible: true },
        recordHistory: false,
      })
      scrollToSection(next.props.id)
    },
    open: setDialog,
    openMore: (history) => {
      setUndoState(history)
      setDialog('more')
    },
    // Ao sair, guarda também a personalidade que ainda esperava a pausa. Se sobrou mudança sem
    // salvar (erro, sem internet, conflito), a janela explica antes, em vez de sair calado.
    leave: async () => {
      await Promise.all([flush(), personalitySaver.flush()])
      if (!isDirty()) return true
      setLeaving({ since: unsavedSince.current })
      return false
    },
    connect,
    personality,
    changePersonality,
  }

  // O que as seções precisam para desenhar na prévia. Todas as páginas contam (até rascunhos):
  // no editor, o botão aparece; a checagem de Publicar avisa do rascunho.
  const metadata: ContentMetadata = useMemo(
    () => ({
      photos: photoById,
      forms: formById,
      pageId,
      pageHrefs: Object.fromEntries(
        props.pages.map((item) => [item.id, item.id === homepageId ? '/' : `/${item.slug}`]),
      ),
      pageAnchors: {},
      anchors: {},
      whatsappHref,
      site,
      mainHeadingId: mainHeadingID(data),
      editing: true,
    }),
    [data, formById, homepageId, pageId, photoById, props.pages, site, whatsappHref],
  )

  const context = useMemo(
    () => ({
      apiRoute,
      pageId,
      homepageId,
      site,
      whatsappHref,
      photos,
      photoById,
      pages: props.pages,
      forms,
      addForm,
      adminRoute,
      pickPhoto: (onPick: (photo: Media) => void) => setPicking(() => onPick),
    }),
    [
      addForm,
      adminRoute,
      apiRoute,
      forms,
      homepageId,
      pageId,
      photoById,
      photos,
      props.pages,
      site,
      whatsappHref,
    ],
  )

  const preview = useMemo(
    () => ({ ...props.chrome, campaign: Boolean(settings.campaign) }),
    [props.chrome, settings.campaign],
  )

  // Tema da prévia com a personalidade escolhida aqui (as medidas dela e o `data-personality`).
  const theme = useMemo<Record<string, string>>(
    () => ({ ...props.theme, '--personality': personality, ...PERSONALITY_TOKENS[personality] }),
    [props.theme, personality],
  )
  const frameStyle = useMemo(
    () => ({ theme, fontFaces: props.fontFaces }),
    [theme, props.fontFaces],
  )
  // Cores do site para as miniaturas da lista de seções e das escolhas (`--ed-site-*`).
  const siteColors = useMemo(
    () =>
      ({
        '--ed-site-primary': theme['--color-primary'],
        '--ed-site-on-primary': theme['--color-on-primary'],
        '--ed-site-bg': theme['--color-background'],
        '--ed-site-surface': theme['--color-surface'],
        '--ed-site-text': theme['--color-text'],
        '--ed-site-deep': theme['--color-deep'],
        '--ed-site-on-deep': theme['--color-on-deep'],
      }) as CSSProperties,
    [theme],
  )

  return (
    <EditorProvider value={context}>
      <FrameStyleProvider value={frameStyle}>
        <SitePreviewProvider value={preview}>
          <ChromeContext.Provider value={chrome}>
            <div className="ed-root" style={siteColors}>
              <Puck<typeof editorConfig>
                config={editorConfig}
                data={initialData}
                dictionary={dictionary}
                height="100%"
                iframe={{ enabled: true, syncHostStyles: false }}
                metadata={metadata}
                onAction={(action, next, previous) => onAction(action, next, previous)}
                onChange={onChange}
                overrides={{
                  fieldTypes: countedFields,
                  header: EditorHeader,
                  iframe: EditorFrame,
                  fields: EditorFields,
                  drawer: EditorDrawer,
                  drawerItem: EditorDrawerItem,
                  actionBar: EditorActionBar,
                }}
                plugins={plugins}
                ui={initialUi}
              />
            </div>

            {dialog === 'publish' && (
              <PublishDialog
                apiRoute={apiRoute}
                data={data}
                onClose={() => setDialog(null)}
                onPhotoChanged={addPhoto}
                onPublish={publish}
                exampleSections={exampleSections.map(
                  (section) => editorConfig.components[section.type]?.label ?? section.type,
                )}
                page={{
                  title: settings.title,
                  googleTitle: googleTitle(
                    { title: settings.title, seoTitle: settings.seo?.title },
                    googleSite,
                    isHome,
                  ),
                  path,
                  opensSite: isHome && !live,
                  seoImage: settings.seo?.image,
                }}
              />
            )}

            {dialog === 'more' && (
              <Dialog onClose={() => setDialog(null)} title={settings.title}>
                <div className="ed-more">
                  <button
                    className="ed-btn"
                    disabled={!undoState.canUndo}
                    onClick={() => {
                      getPuck.current?.().history.back()
                      setDialog(null)
                    }}
                    type="button"
                  >
                    <PanelIcon name="undo" size={16} /> Desfazer
                  </button>
                  <button
                    className="ed-btn"
                    disabled={!undoState.canRedo}
                    onClick={() => {
                      getPuck.current?.().history.forward()
                      setDialog(null)
                    }}
                    type="button"
                  >
                    <PanelIcon name="redo" size={16} /> Refazer
                  </button>
                  <button className="ed-btn" onClick={() => setDialog('versions')} type="button">
                    <PanelIcon name="history" size={16} /> Versões
                  </button>
                  <button className="ed-btn" onClick={() => setDialog('settings')} type="button">
                    <PanelIcon name="sliders" size={16} /> Página e Google
                  </button>
                  <PersonalitySwitch onChange={changePersonality} value={personality} />
                  {live && (
                    <a className="ed-btn" href={path} rel="noopener" target="_blank">
                      <PanelIcon name="eye" size={16} /> Ver no site
                    </a>
                  )}
                </div>
              </Dialog>
            )}

            {dialog === 'versions' && (
              <VersionsDialog
                apiRoute={apiRoute}
                onClose={() => setDialog(null)}
                onRestore={(restored) => {
                  getPuck.current?.().dispatch({ type: 'setData', data: restored })
                  setDialog(null)
                  toast.success('Versão recuperada no rascunho. Publique para colocar no ar.')
                }}
                pageId={pageId}
              />
            )}

            {dialog === 'settings' && (
              <PageSettingsDialog
                automaticDescription={extractDescription(data) ?? ''}
                onClose={() => setDialog(null)}
                onSave={saveSettings}
                settings={settings}
                titleFor={(seoTitle) =>
                  googleTitle({ title: settings.title, seoTitle }, googleSite, isHome)
                }
              />
            )}

            {/* A biblioteca de fotos abre de dentro de outras janelas (Página e Google): fica por
                último, por cima delas. */}
            {picking && (
              <PhotoPicker
                onClose={() => setPicking(null)}
                onPick={(photo) => {
                  picking(photo)
                  setPicking(null)
                }}
                onUploaded={addPhoto}
                photos={photos}
              />
            )}

            {leaving && (
              <Dialog
                footer={
                  <>
                    <button
                      className="ed-btn"
                      onClick={() => {
                        writeLocalCopy(pageId, latest.current)
                        exiting.current = true
                        window.location.href = chrome.backHref
                      }}
                      type="button"
                    >
                      Sair mesmo assim
                    </button>
                    <button
                      autoFocus
                      className="ed-btn ed-btn--primary"
                      onClick={() => {
                        setLeaving(null)
                        if (problemTarget) chrome.goToProblem()
                      }}
                      type="button"
                    >
                      {problemTarget ? 'Corrigir agora' : 'Ficar na página'}
                    </button>
                  </>
                }
                onClose={() => setLeaving(null)}
                role="alertdialog"
                title="Algumas mudanças não foram salvas"
              >
                <p className="ed-leave__why">
                  {conflict
                    ? 'A página mudou em outra aba ou por outra pessoa, e paramos de salvar aqui.'
                    : save.state === 'offline'
                      ? 'Você está sem internet.'
                      : save.state === 'error'
                        ? save.message
                        : 'O último salvamento ainda não terminou.'}
                </p>
                <p>
                  {leaving.since
                    ? `O que você mudou desde as ${timeFormat.format(leaving.since)} não foi salvo.`
                    : 'A última mudança não foi salva.'}{' '}
                  Se sair agora, essas mudanças ficam guardadas só neste aparelho e voltam quando
                  você abrir esta página de novo.
                </p>
              </Dialog>
            )}

            {recovery && (
              <Dialog
                footer={
                  <>
                    <button
                      className="ed-btn"
                      onClick={() => {
                        clearLocalCopy(pageId)
                        setRecovery(null)
                      }}
                      type="button"
                    >
                      Descartar
                    </button>
                    <button
                      autoFocus
                      className="ed-btn ed-btn--primary"
                      onClick={() => {
                        getPuck.current?.().dispatch({ type: 'setData', data: recovery.data })
                        setRecovery(null)
                      }}
                      type="button"
                    >
                      Recuperar as mudanças
                    </button>
                  </>
                }
                onClose={() => setRecovery(null)}
                role="alertdialog"
                title="Há mudanças que não foram salvas"
              >
                <p>
                  Em {dateTimeFormat.format(new Date(recovery.at))}, algumas mudanças nesta página
                  não chegaram a ser salvas. Elas ficaram guardadas neste aparelho. Quer recuperar?
                </p>
              </Dialog>
            )}

            {/* Sem fechar: voltar a editar aqui apagaria o que foi salvo no outro lugar. */}
            {conflict && (
              <div className="ed-overlay">
                <div
                  aria-describedby="ed-conflict-text"
                  aria-labelledby="ed-conflict-title"
                  aria-modal="true"
                  className="ed-dialog"
                  role="alertdialog"
                >
                  <div className="ed-dialog__head">
                    <h2 id="ed-conflict-title">
                      Esta página mudou em outra aba ou por outra pessoa
                    </h2>
                  </div>
                  <div className="ed-dialog__body">
                    <p id="ed-conflict-text">
                      Para não apagar o trabalho de ninguém, paramos de salvar aqui. Escolha qual
                      versão fica: a nova, salva no outro lugar, ou a que está nesta tela.
                    </p>
                  </div>
                  <div className="ed-dialog__foot">
                    <button className="ed-btn" onClick={keepMine} type="button">
                      Manter a desta tela
                    </button>
                    <button
                      autoFocus
                      className="ed-btn ed-btn--primary"
                      onClick={() => {
                        // A pessoa escolheu a outra versão: a desta tela não volta perguntando
                        // ao abrir de novo (para ficar com ela existe "Manter a desta tela").
                        clearLocalCopy(pageId)
                        exiting.current = true
                        window.location.reload()
                      }}
                      type="button"
                    >
                      Carregar a versão nova
                    </button>
                  </div>
                </div>
              </div>
            )}
          </ChromeContext.Provider>
        </SitePreviewProvider>
      </FrameStyleProvider>
    </EditorProvider>
  )
}
