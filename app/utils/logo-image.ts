// Logos are shown at <=96px (2x for HiDPI). Resizing before upload keeps pages light.
export const LOGO_SIZE = 256
export const MAX_LOGO_BYTES = 1024 * 1024
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Unsupported image'))
    img.src = src
  })
}

/**
 * Returns a data URL ready for upload. Raster images are scaled to fit LOGO_SIZE and
 * re-encoded as WebP; animated GIFs and SVGs are kept as-is.
 */
export async function prepareLogo(file: File): Promise<string> {
  const original = await readAsDataUrl(file)
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return original

  const img = await loadImage(original)
  const scale = Math.min(1, LOGO_SIZE / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return original
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  const resized = canvas.toDataURL('image/webp', 0.9)
  // Browsers without WebP encoding fall back to PNG; keep whichever is smaller
  return resized.length < original.length ? resized : original
}

// Approximate decoded size of a base64 data URL
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.floor(base64.length * 3 / 4)
}
