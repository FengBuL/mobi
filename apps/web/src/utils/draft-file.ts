import { sanitizeTitle } from '@mobi/shared/utils/basicHelpers'

export function hashText(value: string) {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(16)
}

export function toMarkdownFileName(title: string) {
  const sanitized = sanitizeTitle(title)
  const base = !sanitized || sanitized === `untitled` ? `未命名` : sanitized
  return /\.md$/i.test(base) ? base : `${base}.md`
}

export function allocateMarkdownFileName(title: string, existingNames: string[]) {
  const taken = new Set(existingNames.map(name => name.toLowerCase()))
  const preferred = toMarkdownFileName(title)
  if (!taken.has(preferred.toLowerCase())) {
    return preferred
  }

  const stem = preferred.replace(/\.md$/i, ``)
  let index = 2
  while (taken.has(`${stem}-${index}.md`.toLowerCase())) {
    index += 1
  }
  return `${stem}-${index}.md`
}
