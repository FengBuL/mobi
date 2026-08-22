export function regexFlags(caseSensitive: boolean) {
  return `gm${caseSensitive ? `` : `i`}`
}

export function findPlainMatches(
  haystack: string,
  needle: string,
  caseSensitive: boolean,
  baseOffset = 0,
) {
  const out: Array<{ from: number, to: number }> = []
  if (!needle)
    return out

  const hay = caseSensitive ? haystack : haystack.toLowerCase()
  const nee = caseSensitive ? needle : needle.toLowerCase()
  let start = 0
  while (start < hay.length) {
    const index = hay.indexOf(nee, start)
    if (index === -1)
      break
    out.push({
      from: baseOffset + index,
      to: baseOffset + index + needle.length,
    })
    start = index + 1
  }
  return out
}
