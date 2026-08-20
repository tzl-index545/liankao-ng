import { readFile } from 'node:fs/promises'

const SIMPLIFIED_PATTERN = /^\s*<SIMPLIFIED_STATEMENT>\s*([\s\S]*?)\s*<\/SIMPLIFIED_STATEMENT>\s*$/

let promptTemplatePromise: Promise<string> | null = null

export function readYuantijiPrompt() {
  if (!promptTemplatePromise) {
    promptTemplatePromise = readFile(new URL('./yuantiji_prompt.md', import.meta.url), 'utf8')
  }
  return promptTemplatePromise
}

export function cleanSimplifiedStatement(response: string) {
  const match = response.match(SIMPLIFIED_PATTERN)
  if (!match?.[1]) {
    throw new Error('Simplifier returned an invalid tagged response')
  }
  const simplified = match[1].replace(/\s+/g, ' ').trim()
  if (!simplified) throw new Error('Simplifier returned an empty statement')
  return simplified
}
