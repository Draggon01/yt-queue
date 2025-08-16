/* Utility: extract YouTube video ID from a URL or raw ID */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  // If it's already a plausible 11-char ID (basic check)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)
    // Handle youtu.be/<id>
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
    // Handle youtube.com/watch?v=<id>
    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtube-nocookie.com')) {
      const v = url.searchParams.get('v')
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      // Handle /embed/<id>
      const pathParts = url.pathname.split('/').filter(Boolean)
      const embedIndex = pathParts.indexOf('embed')
      if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
        const id = pathParts[embedIndex + 1]
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
      }
    }
  } catch {
    // not a URL; fall through
  }
  return null
}
