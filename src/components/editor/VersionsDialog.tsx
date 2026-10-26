'use client'

import React, { useEffect, useState } from 'react'

import { parsePageContent, type PuckPageData } from '@/puck/schema'

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
            const sections = parsed.success ? parsed.data.data.content.length : null
            return (
              <li className="ed-row-item" key={version.id}>
                <div>
                  <b>{dateFormat.format(new Date(version.updatedAt))}</b>
                  {index === 0 && <span className="ed-chip ed-chip--ok">No ar agora</span>}
                  <span className="ed-muted">
                    {version.version.title}
                    {sections !== null && ` · ${sections} ${sections === 1 ? 'seção' : 'seções'}`}
                  </span>
                </div>
                <button
                  className="ed-btn ed-btn--sm"
                  disabled={!parsed.success}
                  onClick={() => parsed.success && onRestore(parsed.data.data)}
                  type="button"
                >
                  Voltar para esta
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Dialog>
  )
}
