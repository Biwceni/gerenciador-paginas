'use client'

import { useConfig, useUploadHandlers } from '@payloadcms/ui'
import { useEffect, useId, useRef, useState } from 'react'

import { photoProblem } from '@/lib/photos'
import type { Media } from '@/payload-types'

import { createQueue } from './photoQueue'
import { uploadPhoto } from './uploadPhoto'

/** Quantas fotos sobem ao mesmo tempo. As outras esperam a vez. */
const AT_ONCE = 3

export type PhotoUpload = {
  id: number
  file: File
  /** Miniatura do próprio arquivo, enquanto a foto não chega à biblioteca. */
  preview: string | null
  state: 'waiting' | 'sending' | 'failed' | 'refused'
  progress: number
  /** Frase para a pessoa, quando o arquivo não serve. */
  problem?: string
}

type Options = {
  /** Uma foto chegou à biblioteca. */
  onUploaded?: (photo: Media) => void
  /** A fila esvaziou: as fotos que chegaram e quantas não chegaram. */
  onFinished?: (result: { uploaded: Media[]; problems: number }) => void
}

let nextId = 1

/**
 * Envio de fotos, usado na tela Fotos e nos seletores. Uma foto que falha fica na lista com
 * "Tentar de novo" e as outras continuam.
 */
export function usePhotoUploads(options: Options = {}) {
  const { config } = useConfig()
  const { getUploadHandler } = useUploadHandlers()
  const apiRoute = config.routes.api

  const [items, setItems] = useState<PhotoUpload[]>([])
  const inputId = useId()
  const round = useRef<{ uploaded: Media[]; problems: number }>({ uploaded: [], problems: 0 })
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  const queue = useRef<ReturnType<typeof createQueue<PhotoUpload, Media>>>(null)
  useEffect(() => {
    const change = (id: number, next: Partial<PhotoUpload>) =>
      setItems((list) => list.map((item) => (item.id === id ? { ...item, ...next } : item)))

    queue.current = createQueue<PhotoUpload, Media>({
      limit: AT_ONCE,
      work: (upload) => {
        // Com o Storage ligado, o plugin registra aqui o envio direto. Só na hora de enviar: ele
        // registra num efeito, depois do primeiro desenho, sem desenhar a tela de novo.
        const direct = Boolean(getUploadHandler({ collectionSlug: 'media' }))
        return uploadPhoto(apiRoute, upload.file, direct, (progress) =>
          change(upload.id, { progress }),
        )
      },
      onStart: (upload) => change(upload.id, { state: 'sending', progress: 0 }),
      onDone: (upload, photo) => {
        forget(upload, setItems)
        round.current.uploaded.push(photo)
        latest.current.onUploaded?.(photo)
      },
      onFail: (upload) => {
        round.current.problems++
        change(upload.id, { state: 'failed' })
      },
      onIdle: () => {
        const result = round.current
        round.current = { uploaded: [], problems: 0 }
        latest.current.onFinished?.(result)
      },
    })
  }, [apiRoute, getUploadHandler])

  const addFiles = (files: FileList | File[]) => {
    const added = Array.from(files).map((file): PhotoUpload => {
      const problem = photoProblem(file) ?? undefined
      return {
        id: nextId++,
        file,
        preview: problem ? null : URL.createObjectURL(file),
        state: problem ? 'refused' : 'waiting',
        progress: 0,
        problem,
      }
    })
    round.current.problems += added.filter((item) => item.state === 'refused').length
    setItems((list) => [...added, ...list])
    queue.current?.add(added.filter((item) => item.state === 'waiting'))
  }

  const retry = (upload: PhotoUpload) => {
    setItems((list) =>
      list.map((item) =>
        item.id === upload.id ? { ...item, state: 'waiting', progress: 0 } : item,
      ),
    )
    queue.current?.add([upload])
  }

  // Aviso ao fechar a aba com foto ainda subindo.
  const busy = items.some((item) => item.state === 'waiting' || item.state === 'sending')
  useEffect(() => {
    if (!busy) return
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [busy])

  return {
    addFiles,
    dismiss: (upload: PhotoUpload) => forget(upload, setItems),
    inputId,
    items,
    open: () => document.getElementById(inputId)?.click(),
    retry,
  }
}

function forget(
  upload: PhotoUpload,
  setItems: React.Dispatch<React.SetStateAction<PhotoUpload[]>>,
) {
  if (upload.preview) URL.revokeObjectURL(upload.preview)
  setItems((list) => list.filter((item) => item.id !== upload.id))
}

export type PhotoUploads = ReturnType<typeof usePhotoUploads>
