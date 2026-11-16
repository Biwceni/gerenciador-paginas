'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { OrphanDraft } from '@/hooks/orphanVersions'
import { editorPath } from '@/lib/editor'

import { PanelDialog } from './PanelDialog'
import { request } from './session'

type Props = { adminRoute: string; apiRoute: string; orphans: OrphanDraft[] }

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso))

/**
 * Rascunho que ficou sem página (B9 v2): sobra de uma página apagada com a conexão caindo, ou dado
 * antigo. Não entra na lista de páginas; aparece aqui, com o nome e a data, e três saídas.
 */
export function OrphanNotice({ adminRoute, apiRoute, orphans: initial }: Props) {
  const router = useRouter()
  const [orphans, setOrphans] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; text: string } | null>(null)
  const [viewing, setViewing] = useState<OrphanDraft | null>(null)
  const [deleting, setDeleting] = useState<OrphanDraft | null>(null)
  const [recovered, setRecovered] = useState<{ id: number; title: string } | null>(null)

  if (!orphans.length && !recovered) return null

  const recover = async (orphan: OrphanDraft) => {
    setBusy(orphan.id)
    setError(null)
    try {
      const { doc } = await request<{ doc: { id: number; title: string } }>(
        apiRoute,
        `/pages/rascunhos-sem-pagina/${orphan.id}/recuperar`,
        { method: 'POST' },
      )
      setOrphans((list) => list.filter((item) => item.id !== orphan.id))
      setRecovered(doc)
      router.refresh()
    } catch (err) {
      setError({ id: orphan.id, text: err instanceof Error ? err.message : 'tente de novo.' })
    } finally {
      setBusy(null)
    }
  }

  const remove = async (orphan: OrphanDraft) => {
    setBusy(orphan.id)
    setError(null)
    try {
      await request(apiRoute, `/pages/rascunhos-sem-pagina/${orphan.id}`, { method: 'DELETE' })
      setOrphans((list) => list.filter((item) => item.id !== orphan.id))
      setDeleting(null)
      router.refresh()
    } catch (err) {
      setDeleting(null)
      setError({ id: orphan.id, text: err instanceof Error ? err.message : 'tente de novo.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="gp-orphan-title" className="gp-warnbox gp-orphans">
      {recovered && (
        <p className="gp-notice" role="status">
          “{recovered.title}” voltou como página, em rascunho. Ela só vai ao ar quando você
          publicar.{' '}
          <Link className="gp-link" href={editorPath(adminRoute, recovered.id)}>
            Abrir no editor
          </Link>
        </p>
      )}
      {orphans.length > 0 && (
        <>
          <div>
            <h2 className="gp-orphans__title" id="gp-orphan-title">
              {orphans.length === 1
                ? 'Um rascunho ficou sem página'
                : `${orphans.length} rascunhos ficaram sem página`}
            </h2>
            <p className="gp-small">
              A página foi apagada, mas o rascunho dela ficou guardado. Você pode trazer de volta
              como página nova (em rascunho) ou apagar de vez.
            </p>
          </div>
          <ul className="gp-orphans__list">
            {orphans.map((orphan) => (
              <li key={orphan.id}>
                <div className="gp-orphans__name">
                  <b>{orphan.title}</b>
                  <span className="gp-small gp-muted">
                    Mexido por último em {when(orphan.updatedAt)}
                  </span>
                  {error?.id === orphan.id && (
                    <span className="gp-hint gp-hint--error" role="alert">
                      Não deu: {error.text} Tente de novo.
                    </span>
                  )}
                </div>
                <div className="gp-actions">
                  <button
                    className="gp-btn gp-btn--sm gp-btn--primary"
                    disabled={busy === orphan.id}
                    onClick={() => recover(orphan)}
                    type="button"
                  >
                    {busy === orphan.id ? 'Aguarde…' : 'Recuperar como página'}
                  </button>
                  <button
                    className="gp-btn gp-btn--sm"
                    onClick={() => setViewing(orphan)}
                    type="button"
                  >
                    Ver o conteúdo
                  </button>
                  <button
                    className="gp-btn gp-btn--sm gp-btn--danger"
                    disabled={busy === orphan.id}
                    onClick={() => setDeleting(orphan)}
                    type="button"
                  >
                    Apagar de vez
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {viewing && (
        <PanelDialog onClose={() => setViewing(null)} title={`Conteúdo de “${viewing.title}”`}>
          <div className="gp-stack">
            <p className="gp-small gp-muted">
              Só para ler. Para mexer, recupere como página e abra no editor.
            </p>
            {viewing.sections.length ? (
              <ol className="gp-orphans__sections">
                {viewing.sections.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ol>
            ) : (
              <p>Este rascunho não tem seções.</p>
            )}
          </div>
        </PanelDialog>
      )}

      {deleting && (
        <PanelDialog onClose={() => setDeleting(null)} title={`Apagar de vez “${deleting.title}”?`}>
          <div className="gp-stack">
            <p>O rascunho some do banco. Não dá para desfazer.</p>
            <div className="gp-actions gp-actions--end">
              <button className="gp-btn" onClick={() => setDeleting(null)} type="button">
                Cancelar
              </button>
              <button
                className="gp-btn gp-btn--solid-danger"
                disabled={busy === deleting.id}
                onClick={() => remove(deleting)}
                type="button"
              >
                {busy === deleting.id ? 'Apagando…' : 'Apagar de vez'}
              </button>
            </div>
          </div>
        </PanelDialog>
      )}
    </section>
  )
}
