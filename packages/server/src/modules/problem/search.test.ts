import { describe, expect, it } from 'bun:test'
import {
  problemSearchOptions,
  problemSearchSettings,
  problemSearchSort,
  statementHtmlToSearchText,
} from './search'

describe('problem search helpers', () => {
  it('extracts visible statement text with block boundaries', () => {
    expect(statementHtmlToSearchText(
      '<style>.hidden{}</style><h2>动态规划</h2><p>状态 &amp; 转移</p><script>bad()</script>',
    )).toBe('动态规划 状态 & 转移')
    expect(statementHtmlToSearchText(null)).toBe('')
  })

  it('keeps relevance order unless an existing sort is selected', () => {
    expect(problemSearchSort(undefined)).toEqual([])
    expect(problemSearchSort('desc')).toEqual(['id:desc'])
    expect(problemSearchSort('qualities-asc')).toEqual(['qualities:asc', 'id:asc'])
    expect(problemSearchSort('difficulties-desc')).toEqual(['difficulties:desc', 'id:desc'])
  })

  it('configures full-text fields without an embedder', () => {
    const settings = problemSearchSettings(12)
    expect(settings).toMatchObject({
      searchableAttributes: ['idText', 'name', 'description', 'statementText'],
    })
    expect(settings.embedders).toBeUndefined()
  })

  it('uses CJK full-text search with the selected existing sort', () => {
    const options = problemSearchOptions(2, 20, 'qualities-desc')
    expect(options).toMatchObject({
      page: 2,
      hitsPerPage: 20,
      matchingStrategy: 'all',
      locales: ['cmn', 'jpn', 'kor'],
      sort: ['qualities:desc', 'id:desc'],
    })
    expect(options.hybrid).toBeUndefined()
  })
})
