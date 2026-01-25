// Font size in pixels
export const FONT_SIZE_PX: Record<string, number> = {
  sm: 24,
  md: 30,
  lg: 36,
  xl: 48,
}

// Font weight values
export const FONT_WEIGHT_VALUE: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// Load Google Font dynamically
export function loadGoogleFont(fontName: string): void {
  const linkId = `google-font-${fontName.replace(/\+/g, '-')}`
  if (document.getElementById(linkId)) return

  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}
