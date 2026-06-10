// Cleans up the press/launch body: sub-headings that are glued into a
// paragraph (e.g. "\nA new model\nBrigada offers…") become their own H2 block
// followed by the paragraph; empty blocks are dropped. Everything else (other
// fields, untouched paragraphs incl. their marks) is preserved.
//
//   cd studio && npx sanity exec scripts/press-restructure-body.mjs --with-user-token

import {getCliClient} from 'sanity/cli'

const client = getCliClient()
const DOC_ID = 'pressRelease-launch'
const HEADINGS = ['New ambition, new talent', 'A new model', 'Sharp Beats Loud']

const doc = await client.getDocument(DOC_ID)
if (!doc) {
  console.error(`Doc ${DOC_ID} not found`)
  process.exit(1)
}

let n = 0
const mkBlock = (style, text) => {
  const key = `r${n++}`
  return {
    _type: 'block',
    _key: key,
    style,
    markDefs: [],
    children: [{_type: 'span', _key: `${key}s`, text, marks: []}],
  }
}
const textOf = (b) =>
  Array.isArray(b.children) ? b.children.map((c) => c.text || '').join('') : b.text || ''

const out = []
for (const b of doc.body || []) {
  const text = textOf(b)
  if (!text.trim()) continue // drop empty blocks
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2 && HEADINGS.includes(lines[0])) {
    out.push(mkBlock('h2', lines[0]))
    out.push(mkBlock('normal', lines.slice(1).join(' ')))
  } else if (lines.length === 1 && HEADINGS.includes(lines[0])) {
    out.push(mkBlock('h2', lines[0]))
  } else {
    out.push(b) // untouched paragraph — keep as-is
  }
}

console.log(`body: ${doc.body?.length ?? 0} → ${out.length} blocks`)
out.forEach((b, i) => console.log(`  ${i} [${b.style}] ${textOf(b).slice(0, 46)}`))
await client.patch(DOC_ID).set({body: out}).commit()
console.log('done.')
