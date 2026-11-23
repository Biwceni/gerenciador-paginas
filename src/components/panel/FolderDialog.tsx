'use client'

import React, { useState } from 'react'

import {
  cleanFolderName,
  FOLDER_NAME_MAX,
  folderNameTaken,
  type PhotoFolder,
} from '@/lib/photoLibrary'

import { PanelDialog } from './PanelDialog'
import { request } from './session'

export type FolderAsk =
  | { kind: 'create' }
  | { kind: 'rename'; id: number; name: string }
  | { kind: 'delete'; id: number; name: string; count: number }

type Props = {
  apiRoute: string
  ask: FolderAsk
  folders: PhotoFolder[]
  onClose: () => void
  /** Deu certo: o aviso para a tela e a pasta para abrir (`null`: todas). */
  onDone: (message: string, openFolder?: number | null) => void
}

/** Criar, renomear ou apagar uma pasta de fotos (C6). Apagar não apaga as fotos. */
export function FolderDialog({ apiRoute, ask, folders, onClose, onDone }: Props) {
  const [name, setName] = useState(ask.kind === 'rename' ? ask.name : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      if (ask.kind === 'delete') {
        setBusy(true)
        await request(apiRoute, `/photo-folders/${ask.id}`, { method: 'DELETE' })
        onDone(
          ask.count
            ? `Pasta “${ask.name}” apagada. As fotos dela continuam na biblioteca, em “Sem pasta”.`
            : `Pasta “${ask.name}” apagada.`,
          null,
        )
        return
      }
      const clean = cleanFolderName(name)
      if (!clean) {
        setError('Escreva um nome para a pasta.')
        return
      }
      if (folderNameTaken(clean, folders, ask.kind === 'rename' ? ask.id : undefined)) {
        setError(`Já existe uma pasta chamada “${clean}”.`)
        return
      }
      setBusy(true)
      if (ask.kind === 'rename') {
        await request(apiRoute, `/photo-folders/${ask.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: clean }),
        })
        onDone(`Pasta renomeada para “${clean}”.`)
      } else {
        const { doc } = await request<{ doc: PhotoFolder }>(apiRoute, '/photo-folders', {
          method: 'POST',
          body: JSON.stringify({ name: clean }),
        })
        onDone(
          `Pasta “${clean}” criada. Envie fotos com ela aberta, ou escolha várias e mude de pasta.`,
          doc.id,
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tente de novo.')
      setBusy(false)
    }
  }

  const title =
    ask.kind === 'create'
      ? 'Nova pasta'
      : ask.kind === 'rename'
        ? `Renomear a pasta “${ask.name}”`
        : `Apagar a pasta “${ask.name}”?`

  return (
    <PanelDialog onClose={onClose} title={title}>
      <form className="gp-folderform" noValidate onSubmit={submit}>
        {ask.kind === 'delete' ? (
          <p>
            {ask.count
              ? `As ${ask.count === 1 ? 'foto' : `${ask.count} fotos`} desta pasta não são apagadas: ${
                  ask.count === 1 ? 'ela vai' : 'elas vão'
                } para “Sem pasta” e continuam nas páginas onde estão.`
              : 'A pasta está vazia. Nenhuma foto muda.'}
          </p>
        ) : (
          <div className="gp-field">
            <label htmlFor="pf-name">Nome da pasta</label>
            <input
              aria-describedby={error ? 'pf-error' : 'pf-hint'}
              aria-invalid={Boolean(error)}
              autoFocus
              className="gp-input"
              id="pf-name"
              maxLength={FOLDER_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Fachada e lojas"
              value={name}
            />
            {error ? (
              <span className="gp-error" id="pf-error" role="alert">
                {error}
              </span>
            ) : (
              <span className="gp-hint" id="pf-hint">
                Só para organizar o painel: o site não mostra as pastas.
              </span>
            )}
          </div>
        )}
        {ask.kind === 'delete' && error && (
          <p className="gp-error" role="alert">
            {error}
          </p>
        )}
        <div className="gp-actions gp-folderform__foot">
          <button className="gp-btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className={`gp-btn ${ask.kind === 'delete' ? 'gp-btn--solid-danger' : 'gp-btn--primary'}`}
            disabled={busy}
            type="submit"
          >
            {ask.kind === 'delete'
              ? 'Apagar a pasta'
              : ask.kind === 'rename'
                ? 'Salvar o nome'
                : 'Criar a pasta'}
          </button>
        </div>
      </form>
    </PanelDialog>
  )
}
