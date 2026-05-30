/**
 * Convert raw HTML coming from Recruitee into Sanity Portable Text blocks
 * compatible with the `job` schema's blockContent fields.
 *
 * Pre-clean
 *   - drop empty tags
 *   - drop `<div>` wrappers
 *   - if any `<h1>` is present, demote every heading by one level (h1→h2,
 *     h2→h3, …, h6→p) so the job's own page heading stays the only h1.
 */

import {htmlToBlocks} from '@portabletext/block-tools'
import {Schema} from '@sanity/schema'
import {JSDOM} from 'jsdom'

const blockContentType = Schema.compile({
  name: 'default',
  types: [
    {
      type: 'array',
      name: 'blockContent',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
            annotations: [],
          },
        },
      ],
    },
  ],
}).get('blockContent')

function preClean(html: string): string {
  let out = html
  // Drop empty tags (e.g. `<p>  </p>`)
  out = out.replace(/<([a-zA-Z0-9]+)[^>]*>\s*<\/\1>/g, '')
  // Drop div wrappers
  out = out.replace(/<\/?div[^>]*>/g, '')
  // Demote heading levels if an h1 exists
  if (/<h1[\s>]/i.test(out)) {
    out = out
      .replace(/<h6[^>]*>/gi, '<p>')
      .replace(/<\/h6>/gi, '</p>')
      .replace(/<h5[^>]*>/gi, '<h6>')
      .replace(/<\/h5>/gi, '</h6>')
      .replace(/<h4[^>]*>/gi, '<h5>')
      .replace(/<\/h4>/gi, '</h5>')
      .replace(/<h3[^>]*>/gi, '<h4>')
      .replace(/<\/h3>/gi, '</h4>')
      .replace(/<h2[^>]*>/gi, '<h3>')
      .replace(/<\/h2>/gi, '</h3>')
      .replace(/<h1[^>]*>/gi, '<h2>')
      .replace(/<\/h1>/gi, '</h2>')
  }
  return out.trim()
}

export function htmlToPortableText(html: string | null | undefined): unknown[] {
  const cleaned = preClean(html ?? '')
  if (!cleaned) return []
  return htmlToBlocks(cleaned, blockContentType, {
    parseHtml: (input) => new JSDOM(input).window.document,
  })
}
