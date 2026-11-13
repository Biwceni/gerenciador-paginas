'use client'

import React, { useEffect, useState } from 'react'

import { parsePageContent, type PuckPageData } from '@/puck/schema'
import { versionChanges } from '@/puck/versionDiff'

import { listPublishedVersions, type PageVersion } from './api'
import { Dialog } from './Dialog'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' })

type Props = {
  apiRoute: string
  pageId: number
  onClose: () => void
  /** Põe o conteúdo da versão no rascunho; só vai ao ar ao publicar. */
  onRestore: (data: PuckPageData) => void
}

/** Cada vez que a página é publicada, o Payload guarda uma cópia. Dá para voltar a qualquer uma. */
export function VersionsDialog({ apiRoute, pageId, onClose, onRestore }: Props) {
  const [versions, setVersions] = useState<PageVersion[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // A versão que a pessoa pediu para voltar: antes de trocar o rascunho, uma confirmação (10.5).
  const [asking, setAsking] = useState<string | null>(null)

  useEffect(() => {
    listPublishedVersions(apiRoute, pageId)
      .then(setVersions)
      .catch((caught: Error) => setError(caught.message))
  }, [apiRoute, pageId])

  return (
    <Dialog
      description="Cada vez que você publica, guardamos uma cópia. Voltar para uma delas muda só o rascunho: o site muda quando você publicar."
      onClose={onClose}
      title="Versões desta página"
    >
      {error && <p className="ed-hint ed-hint--warn">Não deu para carregar as versões: {error}</p>}
      {!versions && !error && <p className="ed-muted">Carregando…</p>}
      {versions?.length === 0 && (
        <p className="ed-muted">Ainda não há versões. A primeira aparece quando você publicar.</p>
      )}
      {versions && versions.length > 0 && (
        <ul className="ed-rows">
          {versions.map((version, index) => {
            const parsed = parsePageContent(version.version.content)
            const older = versions[index + 1]
            const olderParsed = older ? parsePageContent(older.version.content) : null
            const sections = parsed.success ? parsed.data.data.content.length : null
            const changes = parsed.success
              ? versionChanges(
                  parsed.data.data,
                  olderParsed?.success
                    ? olderParsed.data.data
                    : olderParsed
                      ? { content: [] }
                      : null,
                )
              : null
            const live = index === 0
            return (
              <li className="ed-row-item" key={version.id}>
                <div>
                  <b>{dateFormat.format(new Date(version.updatedAt))}</b>
                  {live && <span className="ed-chip ed-chip--ok">No ar agora</span>}
                  <span className="ed-muted">
                    {version.version.title}
                    {sections !== null && ` · ${sections} ${sections === 1 ? 'seção' : 'seções'}`}
                  </span>
                  {changes && <span className="ed-hint">{changes}</span>}
                </div>
                {asking === version.id ? (
                  <div className="ed-confirm" role="group" aria-label="Confirmar">
                    <span className="ed-hint">
                      {live
                        ? 'O rascunho volta a ser igual ao que está no ar, e as mudanças ainda não publicadas se perdem.'
                        : 'O rascunho passa a ser esta versão. O site só muda quando você publicar.'}
                    </span>
                    <button
                      className="ed-btn ed-btn--sm ed-btn--primary"
                      onClick={() => parsed.success && onRestore(parsed.data.data)}
                      type="button"
                    >
                      {live ? 'Descartar e voltar' : 'Voltar para esta'}
                    </button>
                    <button
                      className="ed-btn ed-btn--sm ed-btn--ghost"
                      onClick={() => setAsking(null)}
                      type="button"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    className="ed-btn ed-btn--sm"
                    disabled={!parsed.success}
                    onClick={() => setAsking(version.id)}
                    type="button"
                  >
                    {live ? 'Descartar o rascunho' : 'Voltar para esta'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Dialog>
  )
}
