'use client'

import { RichTextMenu, type RichtextField } from '@puckeditor/core'
import React, { useEffect, useId, useState } from 'react'

import { externalLink } from '@/lib/links'
import { tidyPastedHTML } from '@/lib/pasteHtml'

type MenuProps = Parameters<NonNullable<RichtextField['renderMenu']>>[0]
type TextEditor = NonNullable<MenuProps['editor']>

const LINK_ERROR =
  'Escreva um site (instagram.com/seunegocio), um e-mail (contato@loja.com.br) ou um telefone com DDD.'

/** O endereço do link: site, e-mail, telefone ou uma página deste site ("/contato"). */
function linkHref(value: string): string | null {
  const text = value.trim()
  if (/^\/[\w\-/#]*$/.test(text)) return text
  return externalLink(text)
}

const icon = (path: React.ReactNode) => (
  <svg
    aria-hidden="true"
    fill="none"
    height="18"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="18"
  >
    {path}
  </svg>
)

const LINK_ICON = icon(
  <>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </>,
)

const SUBTITLE_ICON = icon(
  <>
    <path d="M4 6v12M12 6v12M4 12h8" />
    <path d="M16 9.5c.8-1 3.5-1.2 3.5.8 0 1.4-1.4 1.6-2 1.7 1 .1 2.4.5 2.4 2 0 2.2-3 2.2-4 1" />
  </>,
)

/**
 * Cola do Word e Ctrl+K no Texto simples (achados 7.4 e 7.1). Liga no editor de texto assim que
 * ele existe; o Puck não tem opção própria para isso.
 */
function useTextEditorExtras(editor: TextEditor | null, onLinkKey?: () => void) {
  useEffect(() => {
    if (!editor) return
    editor.setOptions({
      editorProps: { ...editor.options.editorProps, transformPastedHTML: tidyPastedHTML },
    })
  }, [editor])

  useEffect(() => {
    if (!editor || !onLinkKey) return
    const dom = editor.view.dom
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onLinkKey()
      }
    }
    dom.addEventListener('keydown', onKey)
    return () => dom.removeEventListener('keydown', onKey)
  }, [editor, onLinkKey])
}

/** O formulário do link, embaixo da barra: escrever o endereço e pôr, ou tirar o link. */
function LinkForm({ editor, onClose }: { editor: TextEditor; onClose: () => void }) {
  const current = (editor.getAttributes('link').href as string | undefined) ?? ''
  const [text, setText] = useState(current.replace(/^mailto:/, ''))
  const [error, setError] = useState('')
  const hintId = useId()
  const empty = editor.state.selection.empty && !current

  const apply = () => {
    const href = linkHref(text)
    if (!href) return setError(LINK_ERROR)
    const chain = editor.chain().focus()
    if (empty) {
      // Nada escolhido: o próprio endereço entra no texto, já com o link (e um espaço antes, se
      // ele ficaria grudado na palavra de antes).
      const { from } = editor.state.selection
      const before = from > 1 ? editor.state.doc.textBetween(from - 1, from) : ''
      chain
        .insertContent([
          ...(before && !/\s/.test(before) ? [{ type: 'text', text: ' ' }] : []),
          { type: 'text', text: text.trim(), marks: [{ type: 'link', attrs: { href } }] },
        ])
        .run()
    } else {
      chain.extendMarkRange('link').setLink({ href }).run()
    }
    onClose()
  }

  return (
    // O Puck só leva o texto à página enquanto o campo dele está com o foco: sair do endereço para
    // o botão não pode contar como sair do campo.
    <div className="ed-rt-link" onBlur={(event) => event.stopPropagation()}>
      <label className="ed-rt-link__label">
        Endereço do link
        <input
          aria-describedby={hintId}
          aria-invalid={error ? true : undefined}
          autoFocus
          className="ed-input"
          onChange={(event) => {
            setText(event.target.value)
            setError('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              apply()
            }
            if (event.key === 'Escape') onClose()
          }}
          placeholder="Site, e-mail ou telefone"
          value={text}
        />
      </label>
      <span className={`ed-hint${error ? ' ed-hint--warn' : ''}`} id={hintId}>
        {error ||
          (empty
            ? 'Nenhuma palavra escolhida: o endereço entra no texto como link.'
            : 'O link vai nas palavras escolhidas no texto.')}
      </span>
      <div className="ed-rt-link__actions">
        <button className="ed-btn ed-btn--sm ed-btn--primary" onClick={apply} type="button">
          {current ? 'Trocar o link' : 'Pôr o link'}
        </button>
        {current && (
          <button
            className="ed-btn ed-btn--sm"
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              onClose()
            }}
            type="button"
          >
            Tirar o link
          </button>
        )}
        <button className="ed-btn ed-btn--sm ed-btn--ghost" onClick={onClose} type="button">
          Cancelar
        </button>
      </div>
    </div>
  )
}

/**
 * Barra do Texto simples no painel (achados 7.1 e 7.5): negrito, itálico e sublinhado; subtítulo e
 * listas como botões com nome (antes eram duas listas chamadas "Escolher" para o leitor de tela); e
 * o botão Link, que faltava. Sai o alinhamento, que o site não usa e ficava sempre apagado.
 */
export function TextMenu({ editor, readOnly }: MenuProps) {
  const [linking, setLinking] = useState(false)
  useTextEditorExtras(editor, readOnly ? undefined : () => setLinking(true))
  const subtitle = Boolean(editor?.isActive('heading', { level: 3 }))
  const linked = Boolean(editor?.isActive('link'))

  return (
    <>
      <RichTextMenu>
        <RichTextMenu.Group>
          <RichTextMenu.Bold />
          <RichTextMenu.Italic />
          <RichTextMenu.Underline />
        </RichTextMenu.Group>
        <RichTextMenu.Group>
          <RichTextMenu.Control
            active={subtitle}
            disabled={readOnly || !editor}
            icon={SUBTITLE_ICON}
            onClick={(event) => {
              event.stopPropagation()
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }}
            title="Subtítulo"
          />
          <RichTextMenu.BulletList />
          <RichTextMenu.OrderedList />
        </RichTextMenu.Group>
        <RichTextMenu.Group>
          <RichTextMenu.Control
            active={linked || linking}
            disabled={readOnly || !editor}
            icon={LINK_ICON}
            onClick={(event) => {
              event.stopPropagation()
              setLinking((open) => !open)
            }}
            title="Link (Ctrl+K)"
          />
        </RichTextMenu.Group>
      </RichTextMenu>
      {linking && editor && <LinkForm editor={editor} onClose={() => setLinking(false)} />}
    </>
  )
}

/** Barra que aparece ao escrever direto na prévia: a de sempre, com a cola do Word arrumada. */
export function InlineTextMenu({ children, editor }: MenuProps) {
  useTextEditorExtras(editor)
  return <RichTextMenu>{children}</RichTextMenu>
}
