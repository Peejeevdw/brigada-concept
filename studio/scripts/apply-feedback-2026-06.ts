/**
 * Apply the June 2026 pre-launch copy + UX feedback pass.
 *
 * Run AFTER the expertise → service schema migration (this script writes to
 * the new types):
 *   pnpm tsx scripts/migrate-expertise-to-service.ts --apply
 *
 * Then dry-run (default — lists what would change, writes nothing):
 *   pnpm tsx scripts/apply-feedback-2026-06.ts
 * Apply:
 *   pnpm tsx scripts/apply-feedback-2026-06.ts --apply
 *
 * What it does:
 *   1. Homepage intro: set `intro.explainer` ("Sharp beats loud" body copy).
 *   2. Homepage awards: set `awards.title` + `awards.description`.
 *   3. Services index page: set hero eyebrow + intro paragraph.
 *   4. Person docs: rename "Anneleen Vandevoorde" → "Anneleen Vande Voorde",
 *      set Mathias/Jeroen/Anneleen positions; warn (don't auto-create) when
 *      Guy / Anneleen are missing.
 *   5. Contact page: set hero eyebrow/title; remove the `project` form field;
 *      reorder serviceContacts so "New bizz" / "Integrated" entry sits on top,
 *      renamed to "General & new bizz".
 *   6. Service docs: set People lead to Guy when the doc exists; leave Brand
 *      finalised copy untouched; Marketing leadIn updated to the doc template.
 *
 * Requires SANITY_STUDIO_PROJECT_ID + SANITY_API_WRITE_TOKEN in studio/.env.
 */
import {createClient, type SanityClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'

loadEnv({path: new URL('../.env', import.meta.url).pathname})

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

const client = createClient({
  projectId: required('SANITY_STUDIO_PROJECT_ID'),
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  apiVersion: '2026-04-08',
  token: required('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
  perspective: 'raw',
})

const APPLY = process.argv.includes('--apply')
const tag = APPLY ? '[apply]' : '[dry-run]'

// ---- Copy strings (approved June 2026) ----

const HOMEPAGE_EXPLAINER =
  'More channels, more messages, more noise, more ... movement? Not exactly. Being louder doesn’t get brands moving. Being sharper does.'

const AWARDS_TITLE = 'Proud, not loud'
const AWARDS_DESCRIPTION =
  'When strategy, creativity, data and experience come together from day one, great work happens.'

const SERVICES_INDEX_EYEBROW = 'The things we do (for love)'
// The hero.title slot doubles as the intro paragraph (no separate intro field
// on serviceIndexPage yet). "Our services" was dropped from the visible copy.
const SERVICES_INDEX_TITLE =
  'To make sharp decisions, you need to see the bigger picture. That’s why we bring together the four key domains of brand, product, people and marketing.'

const CONTACT_HERO_EYEBROW = 'GET IN TOUCH'
const CONTACT_HERO_TITLE =
  'We’re most useful when you involve us early on.\n\nFill out the form or email us, and we’ll get back to you within two working days. You can also call us, or swing by one of our offices.'

const MARKETING_LEAD_IN = 'Got a marketing challenge? {name} knows where to poke.'
const PEOPLE_LEAD_IN = 'The people behind our People services? {name} keeps them moving.'

// ---- Helpers ----

type Doc = {_id: string; _type?: string; [key: string]: unknown}
type Person = Doc & {name?: string; position?: string}

async function findPersonByName(c: SanityClient, fragment: string): Promise<Person | null> {
  const docs = await c.fetch<Person[]>(
    `*[_type == "person" && name match $q][0...3]{_id, name, position}`,
    {q: `*${fragment}*`},
  )
  if (docs.length === 0) return null
  if (docs.length > 1) {
    console.warn(`  ! "${fragment}" matches multiple person docs — using first: ${docs.map((d) => d.name).join(', ')}`)
  }
  return docs[0]
}

async function findServiceBySlug(c: SanityClient, slug: string): Promise<Doc | null> {
  return c.fetch<Doc | null>(
    `*[_type == "service" && slug.current == $slug][0]{_id, _type}`,
    {slug},
  )
}

function logChange(id: string, msg: string) {
  console.log(`  · ${id} ${msg}`)
}

// ---- Steps ----

async function applyHomepageCopy() {
  console.log(`\n${tag} homePage intro + awards`)
  const docs = await client.fetch<Doc[]>(`*[_type == "homePage"]{_id}`)
  if (docs.length === 0) {
    console.log('  (no homePage docs found)')
    return
  }
  if (!APPLY) {
    for (const d of docs) logChange(d._id, `set intro.explainer, awards.title, awards.description`)
    return
  }
  const tx = client.transaction()
  for (const d of docs) {
    tx.patch(d._id, (p) =>
      p.set({
        'intro.explainer': HOMEPAGE_EXPLAINER,
        'awards.title': AWARDS_TITLE,
        'awards.description': AWARDS_DESCRIPTION,
      }),
    )
  }
  await tx.commit({visibility: 'async'})
  console.log(`  → patched ${docs.length}`)
}

async function applyServicesIndexCopy() {
  console.log(`\n${tag} serviceIndexPage hero`)
  const docs = await client.fetch<Doc[]>(`*[_type == "serviceIndexPage"]{_id}`)
  if (docs.length === 0) {
    console.log('  (no serviceIndexPage docs found — has the schema migration run?)')
    return
  }
  if (!APPLY) {
    for (const d of docs) logChange(d._id, `set hero.eyebrow + hero.title (two-paragraph intro)`)
    return
  }
  const tx = client.transaction()
  for (const d of docs) {
    tx.patch(d._id, (p) =>
      p.set({
        'hero.eyebrow': SERVICES_INDEX_EYEBROW,
        'hero.title': SERVICES_INDEX_TITLE,
      }),
    )
  }
  await tx.commit({visibility: 'async'})
  console.log(`  → patched ${docs.length}`)
}

async function applyPersonUpdates() {
  console.log(`\n${tag} person docs (name + position)`)
  type Op = {id: string; patch: Record<string, unknown>; note: string}
  const ops: Op[] = []

  const mathias = await findPersonByName(client, 'Mathias')
  if (mathias) {
    ops.push({id: mathias._id, patch: {position: 'Strategic Director'}, note: 'position → Strategic Director'})
  } else {
    console.warn('  ! Mathias Delmote not found — skipping')
  }

  const jeroen = await findPersonByName(client, 'Jeroen')
  if (jeroen) {
    ops.push({id: jeroen._id, patch: {position: 'Client Partner'}, note: 'position → Client Partner'})
  } else {
    console.warn('  ! Jeroen De Bock not found — skipping')
  }

  // Anneleen — handle both old spelling (Vandevoorde) and new (Vande Voorde).
  let anneleen = await findPersonByName(client, 'Anneleen')
  if (anneleen) {
    const patch: Record<string, unknown> = {position: 'Client Partner'}
    if (anneleen.name && anneleen.name.replace(/\s+/g, '').toLowerCase().includes('vandevoorde') &&
        !anneleen.name.includes('Vande Voorde')) {
      patch.name = 'Anneleen Vande Voorde'
    }
    ops.push({id: anneleen._id, patch, note: `position → Client Partner${patch.name ? ', name → Anneleen Vande Voorde' : ''}`})
  } else {
    console.warn('  ! Anneleen not found in Sanity — create the person doc in Studio, then re-run this script')
  }

  const guy = await findPersonByName(client, 'Guy')
  if (guy) {
    ops.push({id: guy._id, patch: {position: 'Client Partner'}, note: 'position → Client Partner'})
  } else {
    console.warn('  ! Guy (People lead) not found in Sanity — create the person doc in Studio, then re-run this script')
  }

  for (const op of ops) logChange(op.id, op.note)
  if (!APPLY || ops.length === 0) return
  const tx = client.transaction()
  for (const op of ops) tx.patch(op.id, (p) => p.set(op.patch))
  await tx.commit({visibility: 'async'})
  console.log(`  → patched ${ops.length}`)
}

async function applyContactPageUpdates() {
  console.log(`\n${tag} contactPage (hero + form + serviceContacts)`)
  type ContactDoc = Doc & {
    form?: {
      fields?: Array<{_key?: string; name?: string} & Record<string, unknown>>
    }
    serviceContacts?: Array<{_key?: string; label?: string} & Record<string, unknown>>
  }
  const docs = await client.fetch<ContactDoc[]>(`*[_type == "contactPage"]{_id, form, serviceContacts}`)
  if (docs.length === 0) {
    console.log('  (no contactPage docs found)')
    return
  }

  type Patch = {id: string; set: Record<string, unknown>; unset?: string[]; note: string[]}
  const patches: Patch[] = []

  for (const d of docs) {
    const note: string[] = []
    const set: Record<string, unknown> = {
      'hero.eyebrow': CONTACT_HERO_EYEBROW,
      'hero.title': CONTACT_HERO_TITLE,
    }
    note.push('hero eyebrow + title')

    // Drop the `project` field if present.
    const fields = d.form?.fields ?? []
    const nextFields = fields.filter((f) => f.name !== 'project')
    if (nextFields.length !== fields.length) {
      set['form.fields'] = nextFields
      note.push('removed form field "project"')
    }

    // Reorder serviceContacts: lift the "newbizz"/"new bizz"/"integrated"
    // entry to the top and rename its label.
    const contacts = d.serviceContacts ?? []
    if (contacts.length > 0) {
      const isGeneral = (label: unknown) => {
        if (typeof label !== 'string') return false
        const l = label.toLowerCase()
        return l.includes('new bizz') || l.includes('newbizz') || l.includes('integrated') || l.includes('general')
      }
      const top = contacts.find((c) => isGeneral(c.label))
      if (top) {
        const rest = contacts.filter((c) => c !== top)
        const reordered = [{...top, label: 'General & new bizz'}, ...rest]
        set.serviceContacts = reordered
        note.push('serviceContacts reordered + "General & new bizz" moved to top')
      }
    }

    patches.push({id: d._id, set, note})
  }

  for (const p of patches) logChange(p.id, p.note.join('; '))
  if (!APPLY) return
  const tx = client.transaction()
  for (const p of patches) {
    tx.patch(p.id, (q) => {
      let next = q.set(p.set)
      if (p.unset && p.unset.length > 0) next = next.unset(p.unset)
      return next
    })
  }
  await tx.commit({visibility: 'async'})
  console.log(`  → patched ${patches.length}`)
}

async function applyServiceLeads() {
  console.log(`\n${tag} service.lead + service.leadIn`)
  type Op = {id: string; patch: Record<string, unknown>; note: string}
  const ops: Op[] = []

  // Marketing: lead = Anneleen Vande Voorde, leadIn = template
  const marketing = await findServiceBySlug(client, 'marketing')
  const anneleen = await findPersonByName(client, 'Anneleen')
  if (marketing) {
    const patch: Record<string, unknown> = {leadIn: MARKETING_LEAD_IN}
    if (anneleen) {
      patch.lead = {_type: 'reference', _ref: anneleen._id.replace(/^drafts\./, '')}
    }
    ops.push({id: marketing._id, patch, note: `leadIn updated${anneleen ? ' + lead → Anneleen' : ' (lead unchanged — Anneleen not found)'}`})
  } else {
    console.warn('  ! service.marketing not found — skipping')
  }

  // People: lead = Guy, leadIn = template
  const people = await findServiceBySlug(client, 'people')
  const guy = await findPersonByName(client, 'Guy')
  if (people) {
    const patch: Record<string, unknown> = {leadIn: PEOPLE_LEAD_IN}
    if (guy) {
      patch.lead = {_type: 'reference', _ref: guy._id.replace(/^drafts\./, '')}
    }
    ops.push({id: people._id, patch, note: `leadIn updated${guy ? ' + lead → Guy' : ' (lead unchanged — Guy not found)'}`})
  } else {
    console.warn('  ! service.people not found — skipping')
  }

  for (const op of ops) logChange(op.id, op.note)
  if (!APPLY || ops.length === 0) return
  const tx = client.transaction()
  for (const op of ops) tx.patch(op.id, (p) => p.set(op.patch))
  await tx.commit({visibility: 'async'})
  console.log(`  → patched ${ops.length}`)
}

async function run() {
  console.log(`${tag} apply-feedback-2026-06 starting`)
  await applyHomepageCopy()
  await applyServicesIndexCopy()
  await applyPersonUpdates()
  await applyContactPageUpdates()
  await applyServiceLeads()
  console.log(APPLY ? '\nDone.' : '\nDry run only — re-run with --apply to write the changes.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
