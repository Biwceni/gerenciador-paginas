import React from 'react'

// Miniaturas das escolhas visuais das seções (redesign v3, entregas 4 e 5): um desenho simples de
// cada opção, nas cores do site (as variáveis `--ed-site-*` do editor), no mesmo traço das
// miniaturas da Animação. `currentColor` é o texto do site; o fundo da miniatura, o fundo do site.

const ACCENT = 'var(--ed-site-primary)'
const ON_ACCENT = 'var(--ed-site-on-primary)'
const SURFACE = 'var(--ed-site-surface)'
const DEEP = 'var(--ed-site-deep)'
const ON_DEEP = 'var(--ed-site-on-deep)'

type BoxProps = { x: number; y: number; w: number; h: number; o?: number; r?: number; f?: string }

// A cor vai no `style`: o atributo `fill` não aceita variáveis do CSS em todos os navegadores.
const Box = ({ x, y, w, h, o = 1, r = 2, f = 'currentColor' }: BoxProps) => (
  <rect height={h} opacity={o} rx={r} style={{ fill: f }} width={w} x={x} y={y} />
)

/** Título, frase e botão de uma seção, na cor dada (texto do site ou o texto sobre a cor). */
const Lines = ({
  x,
  y,
  f = 'currentColor',
  w = 40,
}: {
  x: number
  y: number
  f?: string
  w?: number
}) => (
  <>
    <Box f={f} h={5} o={0.85} w={w} x={x} y={y} />
    <Box f={f} h={3} o={0.45} w={w * 0.75} x={x} y={y + 9} />
    <Box f={f} h={3} o={0.45} w={w * 0.6} x={x} y={y + 15} />
  </>
)

/** Fundo de seção: claro (o fundo do site), suave ou na cor do site. */
const Background = ({ fill, ink, button }: { fill?: string; ink?: string; button: string }) => (
  <>
    {fill && <Box f={fill} h={56} r={0} w={100} x={0} y={0} />}
    <Lines f={ink} w={46} x={27} y={14} />
    <Box f={button} h={7} r={3.5} w={20} x={40} y={38} />
  </>
)

/** Coluna das Colunas: foto, título e texto. */
const Column = ({ x, w }: { x: number; w: number }) => (
  <>
    <Box f={ACCENT} h={16} o={0.5} r={2} w={w} x={x} y={8} />
    <Box h={3.5} o={0.75} w={w * 0.7} x={x} y={29} />
    <Box h={2.5} o={0.4} w={w * 0.9} x={x} y={36} />
    <Box h={2.5} o={0.4} w={w * 0.6} x={x} y={41} />
  </>
)

/** Destaque com o marcador em cima (ou sem nada). */
const Feature = ({ x, marker }: { x: number; marker: React.ReactNode }) => (
  <>
    {marker}
    <Box h={3.5} o={0.75} w={20} x={x} y={28} />
    <Box h={2.5} o={0.4} w={24} x={x} y={35} />
    <Box h={2.5} o={0.4} w={16} x={x} y={40} />
  </>
)

const FEATURE_X = [8, 38, 68]

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
      <Box f="var(--ed-site-on-primary)" h={4} w={26} x={6} y={26} />
      <Box f="var(--ed-site-on-primary)" h={4} w={30} x={40} y={26} />
      <Box f="var(--ed-site-on-primary)" h={4} w={20} x={78} y={26} />
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
      <Box f="var(--ed-site-on-primary)" h={4} w={24} x={22} y={26} />
      <Box f="var(--ed-site-on-primary)" h={4} w={24} x={54} y={26} />
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
  // Fundo da seção (Claro, Suave, Cor do site) e os fundos próprios do banner.
  'bg-light': <Background button={ACCENT} />,
  'bg-soft': <Background button={ACCENT} fill={SURFACE} />,
  'bg-brand': <Background button={ON_ACCENT} fill={ACCENT} ink={ON_ACCENT} />,
  'hero-image': (
    <>
      <Box f={DEEP} h={56} r={0} w={100} x={0} y={0} />
      <path d="M0 56L34 26l20 16 16-12 30 26z" opacity=".45" style={{ fill: ACCENT }} />
      <Lines f={ON_DEEP} w={44} x={10} y={12} />
      <Box f={ACCENT} h={7} r={3.5} w={20} x={10} y={36} />
    </>
  ),
  'hero-side': (
    <>
      <Lines w={38} x={8} y={14} />
      <Box f={ACCENT} h={7} r={3.5} w={18} x={8} y={38} />
      <Box f={ACCENT} h={56} o={0.55} r={0} w={42} x={58} y={0} />
    </>
  ),
  // Lado da foto (Texto com foto).
  'side-left': (
    <>
      <Box f={ACCENT} h={36} o={0.55} r={3} w={38} x={8} y={10} />
      <Lines w={38} x={54} y={16} />
    </>
  ),
  'side-right': (
    <>
      <Lines w={38} x={8} y={16} />
      <Box f={ACCENT} h={36} o={0.55} r={3} w={38} x={54} y={10} />
    </>
  ),
  // Modelo das Colunas.
  'cols-half': (
    <>
      <Column w={38} x={8} />
      <Column w={38} x={54} />
    </>
  ),
  'cols-thirds': (
    <>
      <Column w={24} x={8} />
      <Column w={24} x={38} />
      <Column w={24} x={68} />
    </>
  ),
  'cols-wide-left': (
    <>
      <Column w={52} x={8} />
      <Column w={24} x={68} />
    </>
  ),
  'cols-wide-right': (
    <>
      <Column w={24} x={8} />
      <Column w={52} x={40} />
    </>
  ),
  // Marcador dos Destaques.
  'marker-none': (
    <>
      {FEATURE_X.map((x) => (
        <Feature key={x} marker={null} x={x} />
      ))}
    </>
  ),
  'marker-icon': (
    <>
      {FEATURE_X.map((x) => (
        <Feature
          key={x}
          marker={
            <path
              d={`M${x + 1} ${14}l3 3 6-7`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
              style={{ stroke: ACCENT }}
            />
          }
          x={x}
        />
      ))}
    </>
  ),
  'marker-number': (
    <>
      {FEATURE_X.map((x, index) => (
        <Feature
          key={x}
          marker={
            <text fontSize="13" fontWeight="700" style={{ fill: ACCENT }} x={x} y={21}>
              {index + 1}
            </text>
          }
          x={x}
        />
      ))}
    </>
  ),
  'marker-photo': (
    <>
      {FEATURE_X.map((x) => (
        <Feature
          key={x}
          marker={<circle cx={x + 7} cy={15} opacity=".6" r={7} style={{ fill: ACCENT }} />}
          x={x}
        />
      ))}
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
