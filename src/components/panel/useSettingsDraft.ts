'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { discardSettings, publishSettings, saveGlobalDraft } from './api'
import { type SettingsState, toSiteData, validateSettings } from './settings'

export type SaveState = 'idle' | 'waiting' | 'saving' | 'invalid' | 'error'

type Options = {
  apiRoute: string
  initial: SettingsState
  /** As configurações já têm mudanças guardadas fora do ar. */
  initialPending: boolean
  /** Aviso depois de publicar ("Configurações publicadas em todo o site."). */
  publishedText: string
  /**
   * Quando o servidor recusa o que foi guardado (uma fonte que o Google não tem): devolve o pedaço
   * a desfazer, ou `null` para mostrar o erro como está.
   */
  recover?: (
    error: string,
    tried: SettingsState,
    from: SettingsState,
  ) => Partial<SettingsState> | null
  /** Depois de publicar ou descartar, com o que ficou na tela. */
  onReset?: (state: SettingsState) => void
  /** Depois de cada rascunho guardado. */
  onSaved?: () => void
}

/**
 * Rascunho das configurações do site (global `site`), dividido pelas telas Configurações e Sua
 * marca: cada mudança é guardada sozinha como rascunho, um pouco depois da última, e o site só muda
 * ao publicar. As duas telas guardam o global inteiro, então cada uma abre com o rascunho mais
 * recente e não apaga o que a outra mudou.
 */
export function useSettingsDraft({
  apiRoute,
  initial,
  initialPending,
  publishedText,
  recover,
  onReset,
  onSaved,
}: Options) {
  const router = useRouter()
  const [state, setState] = useState(initial)
  // O que já está guardado: no rascunho ou, sem rascunho, no ar.
  const [saved, setSaved] = useState(initial)
  const [pending, setPending] = useState(initialPending)
  const [touched, setTouched] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [save, setSave] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  // Os avisos de fora mudam a cada desenho; o efeito de guardar não precisa recomeçar por isso.
  const callbacks = useRef({ recover, onReset, onSaved })
  useEffect(() => {
    callbacks.current = { recover, onReset, onSaved }
  })

  const errors = validateSettings(state)

  const update = (next: Partial<SettingsState>) => {
    setState((current) => ({ ...current, ...next }))
    setTouched(true)
    setSave('waiting')
    setMessage(null)
  }

  /** Desfaz o que o servidor recusou. `true` quando havia o que desfazer. */
  const undoRejected = (text: string, tried: SettingsState, from: SettingsState) => {
    const patch = callbacks.current.recover?.(text, tried, from)
    if (!patch) return false
    setState((current) => ({ ...current, ...patch }))
    return true
  }

  useEffect(() => {
    // Já guardado: depois de salvar, `saved` passa a ser este mesmo estado. Enquanto publica ou
    // descarta, espera: um rascunho gravado no meio criaria de novo as mudanças fora do ar.
    if (!touched || state === saved || busy) return
    const timer = setTimeout(async () => {
      if (Object.keys(validateSettings(state)).length) {
        setSave('invalid')
        return
      }
      setSave('saving')
      try {
        await saveGlobalDraft(apiRoute, 'site', toSiteData(state))
        setSaved(state)
        setPending(true)
        setSaveError(null)
        setSave('idle')
        callbacks.current.onSaved?.()
      } catch (error) {
        const text = error instanceof Error ? error.message : 'Tente de novo.'
        // O que foi recusado volta ao que era e o resto é guardado de novo.
        if (undoRejected(text, state, saved)) {
          setSave('waiting')
          return
        }
        setSaveError(text)
        setSave('error')
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [apiRoute, attempt, busy, saved, state, touched])

  // Aviso ao fechar a aba só enquanto algo ainda não foi guardado (o rascunho guardado fica).
  useEffect(() => {
    if (save === 'idle') return
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [save])

  /** Depois de publicar ou descartar: a tela fica igual ao que está no ar. */
  const reset = (next: SettingsState) => {
    setState(next)
    setSaved(next)
    setSaveError(null)
    setPending(false)
    setSave('idle')
    callbacks.current.onReset?.(next)
  }

  const publish = async () => {
    setBusy(true)
    setMessage(null)
    try {
      await publishSettings(apiRoute, toSiteData(state))
      reset(state)
      setMessage({ tone: 'ok', text: publishedText })
      router.refresh()
    } catch (error) {
      const text = error instanceof Error ? error.message : 'tente de novo.'
      if (undoRejected(text, state, saved)) setSave('waiting')
      setMessage({ tone: 'error', text: `Não deu para publicar: ${text}` })
    } finally {
      setBusy(false)
    }
  }

  const discard = async () => {
    setBusy(true)
    setMessage(null)
    try {
      reset(await discardSettings(apiRoute))
      setMessage({ tone: 'ok', text: 'Mudanças descartadas. Voltou a ser igual ao site no ar.' })
      router.refresh()
    } catch (error) {
      setMessage({
        tone: 'error',
        text: `Não deu para descartar: ${error instanceof Error ? error.message : 'tente de novo.'}`,
      })
    } finally {
      setBusy(false)
    }
  }

  const retry = () => {
    setSave('waiting')
    setAttempt((value) => value + 1)
  }

  const changed = pending || save !== 'idle'
  const hasErrors = Object.keys(errors).length > 0
  const cantPublish = busy
    ? null
    : hasErrors
      ? 'Corrija o campo marcado para publicar'
      : save === 'saving'
        ? 'Espere terminar de salvar'
        : !changed
          ? 'Nada para publicar'
          : null

  return {
    state,
    update,
    errors,
    save,
    saveError,
    busy,
    pending,
    message,
    publish,
    discard,
    retry,
    cantPublish,
  }
}
