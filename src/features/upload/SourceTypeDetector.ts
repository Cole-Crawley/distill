export type InputMode = 'file' | 'url' | 'video' | 'text'

const VIDEO_HOSTNAMES = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

function isVideoUrl(input: string): boolean {
  try {
    return VIDEO_HOSTNAMES.has(new URL(input).hostname)
  } catch {
    return false
  }
}

export function detectInputMode(input: string): InputMode {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return isVideoUrl(input) ? 'video' : 'url'
  }
  return 'text'
}

export function getSourceLabel(mode: InputMode): string {
  const labels: Record<InputMode, string> = {
    file: 'File upload',
    url: 'Article',
    video: 'Video (not supported)',
    text: 'Plain text',
  }
  return labels[mode]
}

export function getSourceIcon(mode: InputMode): string {
  const icons: Record<InputMode, string> = {
    file: '📄',
    url: '🔗',
    video: '⚠️',
    text: '✏️',
  }
  return icons[mode]
}
