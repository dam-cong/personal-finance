export const DEFAULT_PRIMARY_COLOR = '#2563EB'

const SHADE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const

export type ShadeKey = (typeof SHADE_KEYS)[number]

// Lightness lệch so với sắc độ 600 (chính là màu người dùng chọn), mô
// phỏng độ dốc của bảng màu Tailwind mặc định.
const LIGHTNESS_DELTA: Record<ShadeKey, number> = {
  '50': 45,
  '100': 38,
  '200': 30,
  '300': 20,
  '400': 10,
  '500': 5,
  '600': 0,
  '700': -8,
  '800': -15,
  '900': -22,
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hexToShades(hex: string): Record<ShadeKey, string> {
  const { h, s, l } = hexToHsl(hex)
  const shades = {} as Record<ShadeKey, string>
  for (const key of SHADE_KEYS) {
    const lightness = Math.min(97, Math.max(4, l + LIGHTNESS_DELTA[key]))
    shades[key] = hslToHex(h, s, lightness)
  }
  return shades
}
