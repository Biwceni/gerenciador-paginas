'use client'

import { useConfig, useDocumentInfo } from '@payloadcms/ui'
import Link from 'next/link'
import React from 'react'

import { editorPath } from '@/lib/editor'

/** Na lateral da página, no painel: leva para o editor visual, onde o conteúdo é montado. */
export function OpenEditorButton() {
  const { id } = useDocumentInfo()
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()

  if (!id) {
    return (
      <p className="field-description" style={{ marginBottom: 'var(--base)' }}>
        Salve a página para montar o conteúdo no editor visual.
      </p>
    )
  }

  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <Link className="btn btn--style-primary btn--size-medium" href={editorPath(admin, id)}>
        Abrir editor visual
      </Link>
    </div>
  )
}
