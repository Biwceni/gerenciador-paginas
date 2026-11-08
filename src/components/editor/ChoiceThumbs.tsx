import React from 'react'

// Miniaturas das escolhas visuais das seções (redesign v3, entrega 4): um desenho simples de cada
// arrumação, nas cores do painel, no mesmo traço das miniaturas da Animação. `currentColor` é o
// texto; `--ed-accent`, a cor de destaque.

const ACCENT = 'var(--ed-accent)'

type BoxProps = { x: number; y: number; w: number; h: number; o?: number; r?: number; f?: string }

const Box = ({ x, y, w, h, o = 1, r = 2, f = 'currentColor' }: BoxProps) => (
  <rect fill={f} height={h} opacity={o} rx={r} width={w} x={x} y={y} />
)

/** Uma "foto" (na cor de destaque) e uma linha de texto embaixo. */
const Card = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <>
    <Box f={ACCENT} h={h} o={0.55} r={3} w={w} x={x} y={y} />
    <Box h={3} o={0.7} w={w * 0.7} x={x} y={y + h + 3} />
    <Box h={2.5} o={0.35} w={w * 0.45} x={x} y={y + h + 8} />
  </>
)

/** Linha do cardápio: nome, ligação até o preço e o preço. */
const PriceRow = ({ x, y, w, dots }: { x: number; y: number; w: number; dots: boolean }) => (
  <>
    <Box h={3} o={0.7} w={w * 0.32} x={x} y={y} />
    <path
      d={`M${x + w * 0.36} ${y + 2}H${x + w * 0.78}`}
      fill="none"
      opacity=".45"
      stroke="currentColor"
      strokeDasharray={dots ? '1 2.5' : undefined}
      strokeLinecap="round"
      strokeWidth="1.4"
    />
    <Box f={ACCENT} h={3} w={w * 0.16} x={x + w * 0.84} y={y} />
  </>
)

export const CHOICE_THUMBS = {
  'products-three': (
    <>
      <Card h={24} w={24} x={10} y={8} />
      <Card h={24} w={24} x={38} y={8} />
      <Card h={24} w={24} x={66} y={8} />
    </>
  ),
  'products-two': (
    <>
      <Card h={26} w={36} x={12} y={8} />
      <Card h={26} w={36} x={52} y={8} />
    </>
  ),
  'products-list': (
    <>
      {[8, 30].map((y) => (
        <React.Fragment key={y}>
          <Box h={18} o={0.1} r={3} w={80} x={10} y={y} />
          <Box f={ACCENT} h={14} o={0.55} r={2} w={14} x={12} y={y + 2} />
          <Box h={3} o={0.7} w={30} x={31} y={y + 5} />
          <Box h={2.5} o={0.35} w={22} x={31} y={y + 11} />
        </React.Fragment>
      ))}
    </>
  ),
  'prices-two': (
    <>
      {[12, 22, 32, 42].map((y) => (
        <React.Fragment key={y}>
          <PriceRow dots w={36} x={8} y={y} />
          <PriceRow dots w={36} x={56} y={y} />
        </React.Fragment>
      ))}
    </>
  ),
  'prices-one': (
    <>
      {[12, 22, 32, 42].map((y) => (
        <PriceRow dots key={y} w={60} x={20} y={y} />
      ))}
    </>
  ),
  'leader-dots': (
    <>
      {[16, 28, 40].map((y) => (
        <PriceRow dots key={y} w={76} x={12} y={y} />
      ))}
    </>
  ),
  'leader-line': (
    <>
      {[16, 28, 40].map((y) => (
        <PriceRow dots={false} key={y} w={76} x={12} y={y} />
      ))}
    </>
  ),
  'announce-move': (
    <>
      <Box f={ACCENT} h={16} o={0.85} r={2} w={100} x={0} y={20} />
      <Box f="var(--ed-on-accent)" h={4} w={26} x={6} y={26} />
      <Box f="var(--ed-on-accent)" h={4} w={30} x={40} y={26} />
      <Box f="var(--ed-on-accent)" h={4} w={20} x={78} y={26} />
      <path
        d="M58 46h-14M48 42l-4 4 4 4"
        fill="none"
        stroke={ACCENT}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </>
  ),
  'announce-static': (
    <>
      <Box f={ACCENT} h={16} o={0.85} r={2} w={100} x={0} y={20} />
      <Box f="var(--ed-on-accent)" h={4} w={24} x={22} y={26} />
      <Box f="var(--ed-on-accent)" h={4} w={24} x={54} y={26} />
    </>
  ),
  'gallery-grid': (
    <>
      {[10, 34, 58].map((x) =>
        [6, 30].map((y) => (
          <Box f={ACCENT} h={20} key={`${x}-${y}`} o={0.55} r={2} w={20} x={x + 6} y={y} />
        )),
      )}
    </>
  ),
  'gallery-masonry': (
    <>
      <Box f={ACCENT} h={26} o={0.55} r={2} w={22} x={14} y={4} />
      <Box f={ACCENT} h={18} o={0.4} r={2} w={22} x={14} y={33} />
      <Box f={ACCENT} h={16} o={0.4} r={2} w={22} x={39} y={4} />
      <Box f={ACCENT} h={28} o={0.55} r={2} w={22} x={39} y={23} />
      <Box f={ACCENT} h={22} o={0.55} r={2} w={22} x={64} y={4} />
      <Box f={ACCENT} h={22} o={0.4} r={2} w={22} x={64} y={29} />
    </>
  ),
} satisfies Record<string, React.ReactNode>

export type ChoiceThumbName = keyof typeof CHOICE_THUMBS

export function ChoiceThumb({ name }: { name: ChoiceThumbName }) {
  return (
    <svg aria-hidden="true" className="ed-thumb__svg" viewBox="0 0 100 56">
      {CHOICE_THUMBS[name]}
    </svg>
  )
}
