export function titleFromImportedMarkdown(content: string, fallback = `未命名`) {
  const heading = content.match(/^#{1,6}[ \t]+(.+)$/m)
  const name = heading?.[1]?.replace(/\s+/g, ` `).trim()
  return name || fallback
}
