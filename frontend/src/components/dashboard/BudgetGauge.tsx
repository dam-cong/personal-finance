import { useEffect, useRef, useState } from 'react'
import type { BudgetStatus } from '../../types'

interface Props {
  percent: number
  status: BudgetStatus
}

const DELAY_MS = 400
const DURATION_MS = 800

const DIAL_MAX = 120
const CX = 100
const CY = 95
const R_OUTER = 88
const R_INNER = 55
const NEEDLE_LEN = R_INNER - 8

const ZONES: { from: number; to: number; fill: string }[] = [
  { from: 0, to: 105, fill: '#22c55e' }, // 0-70%
  { from: 105, to: 150, fill: '#facc15' }, // 70-100%
  { from: 150, to: 180, fill: '#ef4444' }, // 100-120%
]

function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CX - r * Math.cos(rad), y: CY - r * Math.sin(rad) }
}

function bandPath(a1: number, a2: number): string {
  const outerStart = polar(R_OUTER, a1)
  const outerEnd = polar(R_OUTER, a2)
  const innerEnd = polar(R_INNER, a2)
  const innerStart = polar(R_INNER, a1)
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function labelColor(status: BudgetStatus): string {
  if (status === 'over') return '#dc2626'
  if (status === 'near') return '#ca8a04'
  return '#16a34a'
}

export default function BudgetGauge({ percent, status }: Props) {
  const [animated, setAnimated] = useState(0)
  const [started, setStarted] = useState(false)
  const animatedRef = useRef(0)

  useEffect(() => {
    if (started) return
    const delay = setTimeout(() => setStarted(true), DELAY_MS)
    return () => clearTimeout(delay)
  }, [started])

  useEffect(() => {
    if (!started) return
    let raf: number
    const startAt = performance.now()
    const from = animatedRef.current
    const tick = (now: number) => {
      const t = Math.min((now - startAt) / DURATION_MS, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const value = from + (percent - from) * eased
      animatedRef.current = value
      setAnimated(value)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [started, percent])

  const fraction = Math.min(Math.max(animated, 0), DIAL_MAX) / DIAL_MAX
  const needleDeg = fraction * 180 - 90
  const needleTip = polar(NEEDLE_LEN, 90)

  return (
    <div
      className="mx-auto mt-2 w-full max-w-[220px]"
      role="img"
      aria-label={`Đã dùng ${percent}% hạn mức`}
    >
      <svg viewBox="0 0 200 110" className="h-auto w-full">
        {ZONES.map((z, i) => (
          <path key={i} d={bandPath(z.from, z.to)} fill={z.fill} stroke="#ffffff" strokeWidth={2} />
        ))}
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#374151"
          strokeWidth={4}
          strokeLinecap="round"
          style={{
            transformOrigin: `${CX}px ${CY}px`,
            transform: `rotate(${needleDeg}deg)`,
          }}
        />
        <circle cx={CX} cy={CY} r={6} fill="#374151" />
        <text
          x={CX}
          y={CY - R_INNER * 0.5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={20}
          fontWeight={700}
          fill={labelColor(status)}
        >
          {Math.round(animated)}%
        </text>
      </svg>
    </div>
  )
}
