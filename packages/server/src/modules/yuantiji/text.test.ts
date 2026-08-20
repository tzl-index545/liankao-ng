import { describe, expect, it } from 'bun:test'
import { statementHtmlToYuantijiText } from './text'

describe('statementHtmlToYuantijiText', () => {
  it('keeps visible blocks and removes scripts', () => {
    expect(statementHtmlToYuantijiText(
      '<h2>题目描述</h2><p>求 $A+B$。</p><script>ignore()</script><p>保证有解。</p>',
    )).toBe('题目描述\n求 $A+B$。\n保证有解。')
  })
})
