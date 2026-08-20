import { readFile } from 'node:fs/promises'

const ORIGINAL_MARKER = '[[ORIGINAL]]'
const SIMPLIFIED_PATTERN = /^\s*<SIMPLIFIED_STATEMENT>\s*([\s\S]*?)\s*<\/SIMPLIFIED_STATEMENT>\s*$/

let promptTemplatePromise: Promise<string> | null = null

export function readYuantijiPrompt() {
  if (!promptTemplatePromise) {
    promptTemplatePromise = readFile(new URL('./yuantiji_prompt.md', import.meta.url), 'utf8')
  }
  return promptTemplatePromise
}

export function buildYuantijiPrompt(template: string, originalStatement: string) {
  if (!template.includes(ORIGINAL_MARKER)) {
    throw new Error(`yuantiji prompt is missing ${ORIGINAL_MARKER}`)
  }
  return template.replace(ORIGINAL_MARKER, originalStatement.trim())
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
