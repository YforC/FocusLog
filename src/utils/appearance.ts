const DEFAULT_FONT_SIZE = 16
const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 20
const DEFAULT_BLUR = 0
const MIN_BLUR = 0
const MAX_BLUR = 20
const DEFAULT_FROST = 0
const MIN_FROST = 0
const MAX_FROST = 0.8
const DEFAULT_FONT_COLOR = '#1f2937'

export const normalizeFontSize = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FONT_SIZE
  }
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(parsed)))
}

export const normalizeBlur = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_BLUR
  }
  return Math.min(MAX_BLUR, Math.max(MIN_BLUR, Math.round(parsed)))
}

export const normalizeFrost = (value: unknown) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FROST
  }
  return Math.min(MAX_FROST, Math.max(MIN_FROST, Number(parsed.toFixed(2))))
}

export const normalizeFontColor = (value: unknown) => {
  if (typeof value !== 'string') {
    return DEFAULT_FONT_COLOR
  }
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_FONT_COLOR
  if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(trimmed)) {
    return trimmed
  }
  return DEFAULT_FONT_COLOR
}

export const extractAppearanceSettings = (settings: Record<string, string>) => {
  return {
    backgroundUrl: settings['appearance.background.url'] ?? '',
    fontSize: normalizeFontSize(settings['appearance.font.size']),
    blur: normalizeBlur(settings['appearance.background.blur']),
    frost: normalizeFrost(settings['appearance.background.frost']),
    fontColor: normalizeFontColor(settings['appearance.font.color']),
  }
}

export const applyAppearance = (appearance: {
  backgroundUrl?: string
  fontSize?: number | string
  blur?: number | string
  frost?: number | string
  fontColor?: string
}) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const fontSize = normalizeFontSize(appearance.fontSize ?? DEFAULT_FONT_SIZE)
  root.style.setProperty('--app-font-size', `${fontSize}px`)
  const fontColor = normalizeFontColor(appearance.fontColor ?? DEFAULT_FONT_COLOR)
  root.style.setProperty('--app-font-color', fontColor)
  const rawUrl = (appearance.backgroundUrl ?? '').trim()
  const hasImage = rawUrl.length > 0
  const blur = hasImage ? normalizeBlur(appearance.blur ?? DEFAULT_BLUR) : 0
  root.style.setProperty('--app-bg-blur', `${blur}px`)
  const frost = hasImage ? normalizeFrost(appearance.frost ?? DEFAULT_FROST) : 0
  root.style.setProperty('--app-frost-alpha', `${frost}`)
  if (rawUrl) {
    const escaped = rawUrl.replace(/"/g, '\\"')
    root.style.setProperty('--app-bg-image', `url("${escaped}")`)
  } else {
    root.style.setProperty('--app-bg-image', 'none')
  }
}

export const appearanceDefaults = {
  fontSize: DEFAULT_FONT_SIZE,
  blur: DEFAULT_BLUR,
  frost: DEFAULT_FROST,
  fontColor: DEFAULT_FONT_COLOR,
}
