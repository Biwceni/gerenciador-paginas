'use client'

import '@puckeditor/core/no-external.css'
import '@/app/(frontend)/styles.css'
import './editor.css'

import { type Data, Puck, useGetPuck, type UiState } from '@puckeditor/core'
import { toast } from '@payloadcms/ui'
import Link from 'next/link'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { z } from 'zod'

import type { FormDefinition } from '@/lib/forms'
import { findExampleSections } from '@/lib/examples'
import { panelHref } from '@/lib/panel'
import type { Media } from '@/payload-types'
import { COLUMN_PIECES } from '@/puck/config'
import { editorConfig } from '@/puck/editor-config'
import { type ContentMetadata, mainHeadingID, type SiteInfo } from '@/puck/references'
import { CONTENT_VERSION, parsePageContent, type PuckPageData } from '@/puck/schema'
import { extractDescription, googleTitle } from '@/puck/seo'

import { publishPage, RequestError, saveDraft } from './api'
import { type EditorPageSummary, EditorProvider } from './context'
import { dictionary } from './dictionary'
import { EditorFrame, FrameStyleProvider } from './EditorFrame'
import { type PageSettings, PageSettingsDialog } from './PageSettingsDialog'
import { PhotoPicker } from './PhotoPicker'
import { PreviewTools } from './PreviewTools'
import { PublishDialog } from './PublishDialog'
import { type GetPuck, usePuck } from './puck'
import { type SiteChrome, SitePreviewProvider } from './SitePreview'
import { VersionsDialog } from './VersionsDialog'

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
  | { state: 'error'; message: string }

type DialogName = 'publish' | 'versions' | 'settings' | null

const SAVE_DELAY = 1200
const PIECES: readonly string[] = COLUMN_PIECES

// Prévia em tamanho real: ocupa o espaço que sobra e nunca é encolhida. Sem os controles de zoom.
const initialUi: Partial<UiState> = {
  viewports: { current: { width: '100%', height: 'auto' }, controlsVisible: false, options: [] },
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Mensagem de erro de formato que o leigo entende. */
function friendlyError(error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue?.code === 'too_big') {
    return issue.origin === 'array'
      ? `Passou do número máximo de itens (${issue.maximum}). Remova algum para salvar.`
      : `Um texto passou do limite de ${issue.maximum} letras. Encurte para salvar.`
  }
  if (issue?.code === 'too_small' && issue.origin === 'array') {
    return 'Uma seção ficou sem nenhum item. Coloque pelo menos um para salvar.'
  }
  return 'Algo na página ficou num formato que não dá para salvar. Desfaça a última mudança.'
}

/** Controles da barra de cima, que fica dentro do Puck (override do cabeçalho). */
type Chrome = {
  title: string
  status: string
  statusTone: 'ok' | 'warn' | 'muted'
  canPublish: boolean
  livePath: string | null
  backHref: string
  /** Resumo que aparece no painel da direita quando nenhuma seção está escolhida. */
  summary: { sections: number; address: string; exampleSections: number }
  open: (dialog: DialogName) => void
  leave: () => Promise<void>
  /** A barra roda dentro do Puck: entrega o acesso a ele para o resto do editor. */
  connect: (getPuck: GetPuck) => void
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
          await chrome.leave()
          window.location.href = chrome.backHref
        }}
        title="Voltar para as páginas"
      >
        ←
      </Link>
      <div className="ed-top__title">
        <b>{chrome.title}</b>
        <span className={`ed-top__status ed-top__status--${chrome.statusTone}`} role="status">
          {chrome.status}
        </span>
      </div>
      <div className="ed-top__actions">
        <button
          aria-label="Desfazer"
          className="ed-icon-btn"
          disabled={!history.hasPast}
          onClick={history.back}
          title="Desfazer"
          type="button"
        >
          ↶
        </button>
        <button
          aria-label="Refazer"
          className="ed-icon-btn"
          disabled={!history.hasFuture}
          onClick={history.forward}
          title="Refazer"
          type="button"
        >
          ↷
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
        <button
          className="ed-btn ed-btn--primary"
          disabled={!chrome.canPublish}
          onClick={() => chrome.open('publish')}
          type="button"
        >
          {chrome.canPublish ? 'Publicar' : 'Publicada'}
        </button>
      </div>
      <PreviewTools />
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
  if (itemSelector || !chrome) return <>{children}</>
  const { sections, address, exampleSections } = chrome.summary

  return (
    <>
      <div className="ed-summary">
        <b>Esta página</b>
        <span className="ed-hint">
          {sections === 1 ? '1 seção' : `${sections} seções`} · {address}
        </span>
        {exampleSections > 0 && (
          <span className="ed-hint ed-hint--warn">
            {exampleSections === 1
              ? '1 seção ainda tem texto de exemplo.'
              : `${exampleSections} seções ainda têm texto de exemplo.`}
          </span>
        )}
        <button className="ed-btn ed-btn--sm" onClick={() => chrome.open('settings')} type="button">
          Página e Google
        </button>
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
  const [conflict, setConflict] = useState(false)
  const [photos, setPhotos] = useState(props.photos)
  const [forms, setForms] = useState(props.forms)
  const [picking, setPicking] = useState<((photo: Media) => void) | null>(null)
  const [data, setData] = useState<PuckPageData>(initialData)

  const latest = useRef<PuckPageData>(initialData)
  const lastSaved = useRef(JSON.stringify(initialData))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saving = useRef<Promise<void>>(Promise.resolve())
  // Versão em que este editor está trabalhando: a que abriu e, depois, a de cada salvamento dele.
  const baseUpdatedAt = useRef(props.page.updatedAt)
  const stopped = useRef(false)
  // Acesso ao Puck para quem está fora dele (voltar versão, desfazer peça solta).
  const getPuck = useRef<GetPuck | null>(null)
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

  // Salva o que está na tela, se mudou desde o último salvamento.
  const flush = useCallback((): Promise<void> => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    return send(async () => {
      if (stopped.current) return
      const current = latest.current
      const json = JSON.stringify(current)
      if (json === lastSaved.current) return
      const parsed = parsePageContent({ version: CONTENT_VERSION, data: current })
      if (!parsed.success) return setSave({ state: 'error', message: friendlyError(parsed.error) })
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
        setHasChanges(true)
        setSave(
          JSON.stringify(latest.current) === json
            ? { state: 'saved', at: new Date() }
            : { state: 'pending' },
        )
      } catch (caught) {
        if (stopIfConflict(caught)) return
        setSave({
          state: 'error',
          message: caught instanceof Error ? caught.message : 'sem conexão com o servidor',
        })
      }
    })
  }, [apiRoute, pageId, send, stopIfConflict])

  const onChange = useCallback(
    (next: Data) => {
      const puckData = next as PuckPageData
      latest.current = puckData
      setData(puckData)
      if (JSON.stringify(puckData) === lastSaved.current) return
      setSave({ state: 'pending' })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), SAVE_DELAY)
    },
    [flush],
  )

  // Fechar a aba com mudança ainda não salva: o navegador pergunta antes.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!stopped.current && JSON.stringify(latest.current) !== lastSaved.current) {
        event.preventDefault()
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  // Peças das Colunas só existem dentro delas: soltas na página, a mudança é desfeita.
  const onAction = useCallback(
    (_action: unknown, next: { data: Data }, previous: { data: Data }) => {
      if (!next.data.content.some((item) => PIECES.includes(item.type))) return
      setTimeout(() => {
        getPuck.current?.().dispatch({ type: 'setData', data: previous.data })
        toast.info(
          'Essa peça só entra dentro de uma seção Colunas. Arraste para dentro de uma coluna.',
        )
      })
    },
    [],
  )

  const publish = useCallback(async () => {
    await flush()
    await send(async () => {
      if (stopped.current) throw new Error('a página mudou em outro lugar')
      // Guardado antes do envio: o que mudar enquanto publica continua contando como não salvo.
      const json = JSON.stringify(latest.current)
      const parsed = parsePageContent({ version: CONTENT_VERSION, data: latest.current })
      if (!parsed.success) throw new Error(friendlyError(parsed.error))
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
  const unsaved = save.state === 'pending' || save.state === 'saving'
  const savedAt = save.state === 'saved' ? save.at : undefined

  const knownTexts = props.exampleTexts
  const exampleSections = useMemo(() => findExampleSections(data, knownTexts), [data, knownTexts])
  const googleSite = { name: site.name, tagline }

  const status = conflict
    ? 'Salvamento parado: a página mudou em outro lugar'
    : save.state === 'saving'
      ? 'Salvando…'
      : save.state === 'pending'
        ? 'Salvando em instantes…'
        : save.state === 'error'
          ? `Não deu para salvar: ${save.message}`
          : live && !hasChanges
            ? 'Tudo publicado'
            : `Salvo automaticamente${savedAt ? ` às ${timeFormat.format(savedAt)}` : ''} · ${
                live ? 'há mudanças fora do ar' : 'rascunho, ainda não está no ar'
              }`

  const chrome: Chrome = {
    title: settings.title,
    status,
    statusTone: conflict || save.state === 'error' ? 'warn' : live && !hasChanges ? 'ok' : 'muted',
    canPublish: !live || hasChanges || unsaved || save.state === 'error',
    livePath: live ? path : null,
    backHref: panelHref(adminRoute, 'pages'),
    summary: {
      sections: data.content.length,
      address: `${props.domain}${path === '/' ? '' : path}`,
      exampleSections: exampleSections.length,
    },
    open: setDialog,
    leave: flush,
    connect,
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

  const frameStyle = useMemo(
    () => ({ theme: props.theme, fontFaces: props.fontFaces }),
    [props.theme, props.fontFaces],
  )

  return (
    <EditorProvider value={context}>
      <FrameStyleProvider value={frameStyle}>
        <SitePreviewProvider value={preview}>
          <ChromeContext.Provider value={chrome}>
            <div className="ed-root">
              <Puck<typeof editorConfig>
                config={editorConfig}
                data={initialData}
                dictionary={dictionary}
                height="100%"
                iframe={{ enabled: true, syncHostStyles: false }}
                metadata={metadata}
                onAction={(action, next, previous) => onAction(action, next, previous)}
                onChange={onChange}
                overrides={{ header: EditorHeader, iframe: EditorFrame, fields: EditorFields }}
                ui={initialUi}
              />
            </div>

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
                      Para não apagar o trabalho de ninguém, paramos de salvar aqui. Carregue a
                      versão nova para continuar. O que você mudou nesta aba depois do último
                      salvamento não foi guardado.
                    </p>
                  </div>
                  <div className="ed-dialog__foot">
                    <button
                      autoFocus
                      className="ed-btn ed-btn--primary"
                      onClick={() => window.location.reload()}
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
