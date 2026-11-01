// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { uploadPhoto } from '@/components/panel/uploadPhoto'
import { usePhotoUploads } from '@/components/panel/usePhotoUploads'
import { Photo } from '@/components/site/Photo'
import type { Media } from '@/payload-types'

const handlers = vi.hoisted(() => ({ registered: false }))

vi.mock('@payloadcms/ui', () => ({
  useConfig: () => ({ config: { routes: { api: '/api' } } }),
  useUploadHandlers: () => ({
    getUploadHandler: () => (handlers.registered ? () => {} : undefined),
  }),
}))

const file = (name: string, type = 'image/jpeg') => new File(['foto'], name, { type })

/** XHR de mentira: guarda o que foi enviado e responde com sucesso. */
function fakeXHR(status = 200) {
  const sent: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = []
  class FakeXHR {
    upload: { onprogress?: (event: unknown) => void } = {}
    status = status
    responseText = JSON.stringify({ doc: { id: 7 } })
    onload?: () => void
    onerror?: () => void
    private entry = {
      method: '',
      url: '',
      headers: {} as Record<string, string>,
      body: null as unknown,
    }
    open(method: string, url: string) {
      Object.assign(this.entry, { method, url })
    }
    setRequestHeader(name: string, value: string) {
      this.entry.headers[name] = value
    }
    send(body: unknown) {
      sent.push({ ...this.entry, body })
      this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 })
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
  return sent
}

beforeEach(() => {
  handlers.registered = false
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:foto', revokeObjectURL: () => {} }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('envio direto ao Storage', () => {
  const signed = {
    clientUploadContext: { prefix: 'media', signedReceipt: 'recibo' },
    filename: 'foto-1.jpg',
    headers: { 'Content-Length': '4', 'Content-Type': 'image/jpeg', 'If-None-Match': '*' },
    url: 'https://storage.exemplo/fotos/media/foto-1.jpg',
  }

  it('assina, manda o arquivo ao Storage e cria a foto com o recibo', async () => {
    const sent = fakeXHR()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(signed))
      .mockResolvedValueOnce(Response.json({ doc: { id: 9 } }, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const progress: number[] = []
    const photo = file('foto.jpg')

    const doc = await uploadPhoto('/api', photo, true, (percent) => progress.push(percent))

    expect(fetchMock.mock.calls[0][0]).toBe('/api/storage-s3-generate-signed-url')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      collectionSlug: 'media',
      filename: 'foto.jpg',
      filesize: 4,
      mimeType: 'image/jpeg',
    })

    // O arquivo vai direto ao Storage, nunca para a função da Vercel (limite de ~4,5 MB).
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ method: 'PUT', url: signed.url, body: photo })
    // O navegador recusa quem define o tamanho; ele mesmo manda.
    expect(sent[0].headers).toEqual({ 'Content-Type': 'image/jpeg', 'If-None-Match': '*' })
    expect(progress).toEqual([45])

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/media')
    const body = init.body as FormData
    expect(JSON.parse(body.get('_payload') as string)).toEqual({ alt: '' })
    expect(JSON.parse(body.get('file') as string)).toEqual({
      clientUploadContext: { prefix: 'media', signedReceipt: 'recibo' },
      collectionSlug: 'media',
      filename: 'foto-1.jpg',
      mimeType: 'image/jpeg',
      size: 4,
    })
    expect(doc.id).toBe(9)
  })

  it('falha do Storage vira erro, sem criar a foto', async () => {
    fakeXHR(403)
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(signed))
    vi.stubGlobal('fetch', fetchMock)
    await expect(uploadPhoto('/api', file('foto.jpg'), true, () => {})).rejects.toThrow('403')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sem o Storage, o arquivo vai para a própria API', async () => {
    const sent = fakeXHR()
    const doc = await uploadPhoto('/api', file('foto.jpg'), false, () => {})
    expect(sent[0]).toMatchObject({ method: 'POST', url: '/api/media' })
    expect((sent[0].body as FormData).get('file')).toBeInstanceOf(File)
    expect(doc.id).toBe(7)
  })
})

describe('usePhotoUploads', () => {
  it('usa o envio direto mesmo com o plugin registrando depois do primeiro desenho', async () => {
    const sent = fakeXHR()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('signed-url')
          ? Response.json({
              clientUploadContext: { signedReceipt: 'recibo' },
              headers: {},
              url: 'https://storage.exemplo/foto.jpg',
            })
          : Response.json({ doc: { id: 1 } }),
      ),
    )
    const { result } = renderHook(() => usePhotoUploads())
    // O plugin registra num efeito e não desenha a tela de novo.
    handlers.registered = true

    act(() => result.current.addFiles([file('foto.jpg')]))
    await waitFor(() => expect(result.current.items).toHaveLength(0))
    expect(sent[0]).toMatchObject({ method: 'PUT', url: 'https://storage.exemplo/foto.jpg' })
  })

  it('uma foto falha e fica com "Tentar de novo"; as outras chegam', async () => {
    let online = false
    class FlakyXHR {
      upload = {}
      status = 200
      responseText = JSON.stringify({ doc: { id: 5 } })
      onload?: () => void
      onerror?: () => void
      open() {}
      setRequestHeader() {}
      send(body: FormData) {
        const name = (body.get('file') as File).name
        queueMicrotask(() => (name === 'ruim.jpg' && !online ? this.onerror?.() : this.onload?.()))
      }
    }
    vi.stubGlobal('XMLHttpRequest', FlakyXHR)
    const onUploaded = vi.fn()
    const onFinished = vi.fn()
    const { result } = renderHook(() => usePhotoUploads({ onUploaded, onFinished }))

    act(() =>
      result.current.addFiles([
        file('boa.jpg'),
        file('ruim.jpg'),
        file('outra.jpg'),
        file('nota.pdf', 'application/pdf'),
      ]),
    )
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1))
    expect(onUploaded).toHaveBeenCalledTimes(2)
    expect(onFinished.mock.calls[0][0].problems).toBe(2)
    expect(result.current.items.map((item) => [item.file.name, item.state]).sort()).toEqual([
      ['nota.pdf', 'refused'],
      ['ruim.jpg', 'failed'],
    ])

    online = true
    const failed = result.current.items.find((item) => item.state === 'failed')!
    act(() => result.current.retry(failed))
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(2))
    expect(onUploaded).toHaveBeenCalledTimes(3)
    expect(result.current.items.map((item) => item.file.name)).toEqual(['nota.pdf'])
  })
})

describe('foto no site', () => {
  it('sem descrição, sai com alt vazio', () => {
    const photo = {
      id: 1,
      alt: null,
      url: 'https://images.pexels.com/photos/1/a.jpeg',
      width: 10,
      height: 10,
    } as Media
    const html = renderToStaticMarkup(<Photo media={photo} sizes="100vw" />)
    expect(html).toContain('alt=""')
  })
})
