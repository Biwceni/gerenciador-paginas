'use client'

import React, { useEffect, useId, useMemo, useState } from 'react'

import {
  CATEGORY_PARAM,
  categorySlug,
  matchesSearch,
  PRODUCT_SORT_LABELS,
  type ProductSort,
  sortedOrder,
} from '@/lib/products'

export type ProductCard = {
  /** O cartão já desenhado no servidor (foto, nome, preço, botões). */
  node: React.ReactNode
  name: string
  category: string
  price: number | null
  /** Nome, frase, categoria e selo juntos, para a busca. */
  search: string
}

const order = (index: number) => ({ '--i': index }) as React.CSSProperties

/**
 * Lista da Vitrine com filtro por categoria, busca e "Ordenar" (B3). Os cartões vêm prontos do
 * servidor; aqui só se escolhe quais aparecem e em que ordem, trocando a lista de verdade (e não
 * só o desenho), para o teclado e o leitor de tela seguirem a ordem que se vê.
 *
 * - Categorias: com 2 ou mais. No celular ficam numa linha que rola para o lado.
 * - Busca e "Ordenar": só com 12 ou mais itens (`tools`).
 * - A categoria escolhida vai para o endereço (`?categoria=vitaminas`), para dar para compartilhar.
 *   No editor o endereço não muda.
 */
export function ProductsBrowse({
  cards,
  categories,
  tools,
  sort: initialSort,
  editing,
  className,
  wordy,
}: {
  cards: ProductCard[]
  categories: string[]
  tools: boolean
  sort: ProductSort
  editing?: boolean
  className: string
  wordy?: boolean
}) {
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  // A ordem escolhida pelo visitante; sem escolha, vale a da seção (que o editor pode trocar).
  const [chosen, setSort] = useState<ProductSort | null>(null)
  const sort = chosen ?? initialSort
  const id = useId()

  // Endereço com `?categoria=`: abre já filtrado. Só depois de montar, como o resto do site.
  useEffect(() => {
    if (editing) return
    const wanted = new URLSearchParams(window.location.search).get(CATEGORY_PARAM)
    const found = categories.find((name) => categorySlug(name) === wanted)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o endereço só existe no navegador
    if (found) setCategory(found)
  }, [categories, editing])

  const choose = (next: string) => {
    setCategory(next)
    if (editing) return
    const url = new URL(window.location.href)
    if (next) url.searchParams.set(CATEGORY_PARAM, categorySlug(next))
    else url.searchParams.delete(CATEGORY_PARAM)
    window.history.replaceState(window.history.state, '', url)
  }

  const visible = useMemo(() => {
    const ranked = sortedOrder(cards, sort)
    return ranked.filter((index) => {
      const card = cards[index]
      if (category && categorySlug(card.category) !== categorySlug(category)) return false
      return !query.trim() || matchesSearch(card.search, query)
    })
  }, [cards, category, query, sort])

  const showCategories = categories.length >= 2
  const filtering = Boolean(category || query.trim())
  const count = `${visible.length} ${visible.length === 1 ? 'item' : 'itens'}`

  return (
    <>
      {(showCategories || tools) && (
        <div className="products-tools anim-part">
          {showCategories && (
            <div className="products-tools__cats-wrap">
              <div aria-label="Categorias" className="products-tools__cats" role="group">
                {['', ...categories].map((name) => (
                  <button
                    aria-pressed={categorySlug(category) === categorySlug(name)}
                    className="products-tools__cat"
                    key={name || 'todos'}
                    onClick={() => choose(name)}
                    type="button"
                  >
                    {name || 'Todos'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {tools && (
            <div className="products-tools__end">
              <label className="products-tools__search">
                <span className="visually-hidden">Buscar nesta lista</span>
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="18"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                  width="18"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4.5 4.5" />
                </svg>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar"
                  type="search"
                  value={query}
                />
              </label>
              <label className="products-tools__sort">
                <span>Ordenar</span>
                <select
                  onChange={(event) => setSort(event.target.value as ProductSort)}
                  value={sort}
                >
                  {(Object.keys(PRODUCT_SORT_LABELS) as ProductSort[]).map((key) => (
                    <option key={key} value={key}>
                      {PRODUCT_SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}
      <p aria-live="polite" className="visually-hidden" id={`${id}-count`}>
        {filtering ? count : ''}
      </p>
      {visible.length ? (
        <ul className={className} data-count={visible.length} data-wordy={wordy || undefined}>
          {visible.map((index, position) => (
            <li className="product anim-part" key={index} style={order(position)}>
              {cards[index].node}
            </li>
          ))}
        </ul>
      ) : (
        <p className="products-empty" role="status">
          {query.trim() ? <>Nada com “{query.trim()}”. </> : <>Nada nesta categoria. </>}
          <button
            className="products-empty__all"
            onClick={() => {
              setQuery('')
              choose('')
            }}
            type="button"
          >
            Ver todos
          </button>
        </p>
      )}
    </>
  )
}

/**
 * "Mais detalhes" de um item (B2): abre uma janela no próprio site, com as fotos, o texto e o
 * botão do item. Fecha no X, no Esc ou tocando fora, e o foco volta para o botão.
 */
export function ProductDetails({
  name,
  editing,
  children,
}: {
  name: string
  editing?: boolean
  children: React.ReactNode
}) {
  const dialog = React.useRef<HTMLDialogElement>(null)
  const title = useId()
  if (editing) return <span className="product__more">Mais detalhes</span>
  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={name ? `Mais detalhes: ${name}` : undefined}
        className="product__more"
        onClick={() => dialog.current?.showModal()}
        type="button"
      >
        Mais detalhes
      </button>
      <dialog
        aria-labelledby={title}
        className="product-dialog"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close()
        }}
        ref={dialog}
      >
        <div className="product-dialog__inner">
          <button
            aria-label="Fechar"
            className="product-dialog__close"
            onClick={() => dialog.current?.close()}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="20"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="20"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <h2 className="product-dialog__title" id={title}>
            {name}
          </h2>
          {children}
        </div>
      </dialog>
    </>
  )
}
