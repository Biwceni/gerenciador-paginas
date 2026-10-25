import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * O site público é estático (rápido e barato). Ao publicar qualquer coisa, todo o cache é renovado:
 * cabeçalho, rodapé e configurações aparecem em todas as páginas, e o site é pequeno.
 */
function revalidateSite(req: PayloadRequest) {
  try {
    revalidatePath('/', 'layout')
  } catch (error) {
    // Fora de uma requisição do Next (scripts como o `seed`) não há cache para renovar.
    req.payload.logger.debug({ err: error }, 'Cache do site não renovado (fora do Next)')
  }
}

type WithStatus = { id: number | string; _status?: 'draft' | 'published' | null }

// Rascunho novo não aparece no site; publicar, mudar o que está no ar ou tirar do ar, sim.
export const revalidateOnPublish: CollectionAfterChangeHook<WithStatus> = ({
  doc,
  previousDoc,
  req,
}) => {
  if (doc._status === 'published' || previousDoc?._status === 'published') revalidateSite(req)
  return doc
}

export const revalidateGlobalOnPublish: GlobalAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (doc?._status === 'published' || previousDoc?._status === 'published') revalidateSite(req)
  return doc
}

export const revalidateOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidateSite(req)
  return doc
}

export const revalidateOnDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateSite(req)
  return doc
}
