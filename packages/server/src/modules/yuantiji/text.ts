import { load } from 'cheerio'

export function statementHtmlToYuantijiText(statementHtml: string) {
  const $ = load(statementHtml)
  $('script, style').remove()
  $('br').replaceWith('\n')
  $('address, article, aside, blockquote, div, dl, fieldset, figcaption, figure, footer, form, h1, h2, h3, h4, h5, h6, header, hr, li, main, nav, ol, p, pre, section, table, tr, ul')
    .each((_, element) => {
      $(element).append('\n')
    })
  return $.text()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}
