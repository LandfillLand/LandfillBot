export function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') return message
  if (message instanceof Error) return message.message

  if (typeof message === 'object' && message !== null && 'message' in message) {
    const maybeMessage = (message as { message?: unknown }).message
    if (typeof maybeMessage === 'string') return maybeMessage
  }

  try {
    return String(message)
  } catch {
    return JSON.stringify(message)
  }
}

export function toReadmeUrl(repo?: string | null): string | null {
  const raw = (repo ?? '').trim()
  if (!raw) return null

  // Support common git ssh form: git@github.com:owner/repo(.git)
  const sshMatch = raw.match(/^git@([^:]+):(.+)$/i)
  let url = sshMatch ? `https://${sshMatch[1]}/${sshMatch[2]}` : raw

  url = url.replace(/\.git$/i, '').replace(/\/+$/g, '')
  if (!/^https?:\/\//i.test(url)) return null

  if (!url.includes('#') && !/\/(blob|tree)\//i.test(url)) {
    url += '#readme'
  }
  return url
}
