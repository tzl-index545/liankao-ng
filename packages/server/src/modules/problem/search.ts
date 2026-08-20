import { load } from 'cheerio'
import { Meilisearch, MeilisearchApiError, type SearchParams, type Settings } from 'meilisearch'
import { env } from '../../config/env'
import { prisma } from '../../prisma'
import type { ProblemListQuery } from './model'

const PROBLEM_INDEX_UID = 'problems'
const TASK_TIMEOUT_MS = 15 * 60 * 1000
const MIN_MAX_TOTAL_HITS = 100000
const CJK_LOCALES = ['cmn', 'jpn', 'kor']

type ProblemSearchDocument = {
  id: number
  idText: string
  name: string
  description: string
  statementText: string
  difficulties: number | null
  qualities: number | null
}

type ProblemSearchResult = {
  ids: number[]
  total: number
}

type ProblemSearchOptions = SearchParams & {
  page: number
  hitsPerPage: number
}

let client: Meilisearch | null = null

function getClient() {
  if (!client) {
    client = new Meilisearch({
      host: env.meiliHost,
      ...(env.meiliApiKey ? { apiKey: env.meiliApiKey } : {}),
    })
  }
  return client
}

function getIndex() {
  return getClient().index<ProblemSearchDocument>(PROBLEM_INDEX_UID)
}

let dirty = true
let indexedCount = 0
let syncPromise: Promise<number> | null = null

export function statementHtmlToSearchText(statementHtml: string | null) {
  if (!statementHtml) return ''
  const $ = load(statementHtml)
  $('script, style').remove()
  $('br').replaceWith(' ')
  $('address, article, aside, blockquote, div, dl, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, tr, ul')
    .each((_, element) => {
      $(element).append(' ')
    })
  return $.text().replace(/\s+/g, ' ').trim()
}

export function problemSearchSort(order: ProblemListQuery['order']) {
  if (order === 'qualities-desc') return ['qualities:desc', 'id:desc']
  if (order === 'qualities-asc') return ['qualities:asc', 'id:asc']
  if (order === 'difficulties-desc') return ['difficulties:desc', 'id:desc']
  if (order === 'difficulties-asc') return ['difficulties:asc', 'id:asc']
  if (order === 'asc') return ['id:asc']
  if (order === 'desc') return ['id:desc']
  return []
}

export function problemSearchSettings(documentCount: number): Settings {
  return {
    searchableAttributes: ['idText', 'name', 'description', 'statementText'],
    displayedAttributes: ['id'],
    sortableAttributes: ['id', 'difficulties', 'qualities'],
    pagination: { maxTotalHits: Math.max(MIN_MAX_TOTAL_HITS, documentCount) },
    localizedAttributes: [{
      attributePatterns: ['name', 'description', 'statementText'],
      locales: CJK_LOCALES,
    }],
    typoTolerance: {
      enabled: true,
      disableOnAttributes: ['idText'],
      disableOnNumbers: true,
    },
  }
}

export function problemSearchOptions(
  page: number,
  pageSize: number,
  order: ProblemListQuery['order'],
): ProblemSearchOptions {
  const sort = problemSearchSort(order)
  return {
    page,
    hitsPerPage: pageSize,
    attributesToRetrieve: ['id'],
    matchingStrategy: 'all',
    locales: CJK_LOCALES,
    ...(sort.length > 0 ? { sort } : {}),
  }
}

function isIndexNotFound(error: unknown) {
  return error instanceof MeilisearchApiError && error.cause?.code === 'index_not_found'
}

async function waitForTask(task: { taskUid: number }) {
  const result = await getClient().tasks.waitForTask(task.taskUid, {
    timeout: TASK_TIMEOUT_MS,
    interval: 500,
  })
  if (result.status === 'failed') {
    throw new Error(result.error?.message ?? `Meilisearch task ${task.taskUid} failed`)
  }
}

async function ensureIndex() {
  try {
    await getClient().getIndex(PROBLEM_INDEX_UID)
    return
  } catch (error) {
    if (!isIndexNotFound(error)) throw error
  }
  await waitForTask(await getClient().createIndex(PROBLEM_INDEX_UID, { primaryKey: 'id' }))
}

async function syncAllProblems() {
  const rows = await prisma.problem.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      statementHtml: true,
      difficulties: true,
      qualities: true,
    },
  })
  const documents = rows.map((row) => ({
    id: row.id,
    idText: String(row.id),
    name: row.name,
    description: row.description,
    statementText: statementHtmlToSearchText(row.statementHtml),
    difficulties: row.difficulties,
    qualities: row.qualities,
  }))
  const settings = problemSearchSettings(documents.length)
  const index = getIndex()

  await ensureIndex()
  await waitForTask(await index.updateSettings(settings))
  if (documents.length > 0) {
    await waitForTask(await index.addDocuments(documents, { primaryKey: 'id' }))
  }

  const indexed = await index.getDocuments<{ id: number }>({
    fields: ['id'],
    limit: Math.max(MIN_MAX_TOTAL_HITS, documents.length),
  })
  const ids = new Set(documents.map((document) => document.id))
  const staleIds = indexed.results
    .map((document) => Number(document.id))
    .filter((id) => !ids.has(id))
  if (staleIds.length > 0) {
    await waitForTask(await index.deleteDocuments(staleIds))
  }

  indexedCount = documents.length
  return indexedCount
}

export function markProblemSearchDirty() {
  dirty = true
}

async function ensureSynced() {
  if (!dirty && !syncPromise) return indexedCount
  if (!syncPromise) {
    dirty = false
    syncPromise = syncAllProblems()
      .catch((error) => {
        dirty = true
        throw error
      })
      .finally(() => {
        syncPromise = null
      })
  }
  return syncPromise
}

export abstract class ProblemSearchService {
  static async search(
    query: string,
    page: number,
    pageSize: number,
    order: ProblemListQuery['order'],
  ): Promise<ProblemSearchResult> {
    await ensureSynced()
    const result = await getIndex().search(query, problemSearchOptions(page, pageSize, order))
    return {
      ids: result.hits.map((hit) => Number(hit.id)),
      total: result.totalHits,
    }
  }

  static async rebuild() {
    await ensureIndex()
    await waitForTask(await getIndex().deleteAllDocuments())
    dirty = true
    return ensureSynced()
  }
}
