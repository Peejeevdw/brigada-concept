// Moves the Senta "discipline-agnostic" quote out of the press/launch body and
// into the new sidebarQuote field. Preserves everything else (heroMedia,
// heroSound, etc.) by patching only `body` + `sidebarQuote`.
//
//   cd studio && npx sanity exec scripts/press-sidebar-quote.mjs --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient()
const DOC_ID = 'pressRelease-launch'
const MATCH = 'What is quite unique about Brigada'

const SENTA_QUOTE = {
  _type: 'quote',
  text: "What is quite unique about Brigada, is that it's genuinely made up of leading experts in branding, design, advertising, digital products, growth, experiential, people and culture, and that as a result, we are discipline-agnostic. What matters is finding the right solution, not pushing a particular capability.",
  author: 'Senta Slingerland',
  role: 'Chief Strategy Officer, Brigada',
}

const doc = await client.getDocument(DOC_ID)
if (!doc) {
  console.error(`Doc ${DOC_ID} not found`)
  process.exit(1)
}

// Quotes may live as `quote` objects (with .text) or as portable-text blocks
// (text in children[].text). Match either.
const textOf = (b) => {
  if (typeof b.text === 'string') return b.text
  if (Array.isArray(b.children)) return b.children.map((c) => c.text || '').join('')
  return ''
}
const newBody = (doc.body || []).filter((b) => !textOf(b).includes(MATCH))

console.log(`body: ${doc.body?.length ?? 0} → ${newBody.length} blocks`)
await client.patch(DOC_ID).set({body: newBody, sidebarQuote: SENTA_QUOTE}).commit()
console.log('done — sidebarQuote set, inline duplicate removed.')
