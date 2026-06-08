/**
 * Rename Sanity data from the old `expertise` schema to the new `service` schema.
 *
 * Sanity treats `_type` as immutable on a per-`_id` basis (even delete + create
 * in the same transaction is rejected). So this migration creates NEW docs at
 * NEW `_id`s and rewrites every incoming reference to point at them, then
 * deletes the old docs.
 *
 * What it does:
 *   1. Discover every `_type == "expertise"` / "expertiseIndexPage" doc (incl.
 *      drafts). Build oldId → newId map (friendly ids `expertise-X-en` →
 *      `service-X-en`; UUID ids get a fresh UUID).
 *   2. Create new docs at the new ids with the new `_type` and field-rewrites
 *      applied to any internal refs (e.g. serviceIndexPage.pillars[]._ref).
 *   3. Rewrite incoming refs everywhere — work.expertises (→ services),
 *      contactPage.expertiseContacts (→ serviceContacts with inner expertise →
 *      service), job.expertise (→ service), menu.items[].internal,
 *      translation.metadata.translations[].value.
 *   4. Delete the old docs.
 *
 * Run order (REQUIRED):
 *   a. Deploy the new Studio schema first (so the `service` / `serviceIndexPage`
 *      types exist in the deployed schema; editors won't see "unknown type"
 *      after migration).
 *   b. Dry-run (default — lists what would change, writes nothing):
 *        pnpm tsx scripts/migrate-expertise-to-service.ts
 *   c. Apply:
 *        pnpm tsx scripts/migrate-expertise-to-service.ts --apply
 *
 * Requires SANITY_STUDIO_PROJECT_ID + SANITY_API_WRITE_TOKEN in studio/.env.
 *
 * Safe to re-run: nothing left → no-op.
 */
import {randomUUID} from 'node:crypto'
import {createClient, type SanityDocument} from '@sanity/client'
import {config as loadEnv} from 'dotenv'

loadEnv({path: new URL('../.env', import.meta.url).pathname})

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
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

type AnyDoc = SanityDocument & Record<string, unknown>
type Ref = {_type: 'reference'; _ref: string; _key?: string; _weak?: boolean; _strengthenOnPublish?: unknown}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isRef = (v: unknown): v is Ref => isRecord(v) && v._type === 'reference' && typeof v._ref === 'string'

const TYPE_MAP: Record<string, string> = {
  expertise: 'service',
  expertiseIndexPage: 'serviceIndexPage',
}
const TEMPLATE_MAP: Record<string, string> = {
  'expertise-by-locale': 'service-by-locale',
}

/**
 * Recursively walk a value, rewriting any reference `_ref` found in `idMap`.
 * When a ref is rewritten, also update its `_strengthenOnPublish.type` and
 * `_strengthenOnPublish.template.id` hints if they still point at the old
 * schema type / initial-value-template (Sanity uses these when strengthening
 * a weak ref on publish — they would error out otherwise).
 */
function rewriteRefs<T>(value: T, idMap: Map<string, string>): T {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteRefs(item, idMap)) as unknown as T
  }
  if (isRef(value)) {
    const next = idMap.get(value._ref)
    if (!next) return value as T
    const out: Record<string, unknown> = {...value, _ref: next}
    if (isRecord(value._strengthenOnPublish)) {
      const sp = value._strengthenOnPublish as Record<string, unknown>
      const nextSp: Record<string, unknown> = {...sp}
      if (typeof sp.type === 'string' && TYPE_MAP[sp.type]) nextSp.type = TYPE_MAP[sp.type]
      if (isRecord(sp.template) && typeof (sp.template as Record<string, unknown>).id === 'string') {
        const tid = (sp.template as Record<string, unknown>).id as string
        if (TEMPLATE_MAP[tid]) nextSp.template = {...(sp.template as Record<string, unknown>), id: TEMPLATE_MAP[tid]}
      }
      out._strengthenOnPublish = nextSp
    }
    return out as T
  }
  if (isRecord(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = rewriteRefs(v, idMap)
    return out as T
  }
  return value
}

/** Compute the new id for a single old id. `idMap` is filled in here. */
function planNewId(oldId: string): string {
  const isDraft = oldId.startsWith('drafts.')
  const bare = isDraft ? oldId.slice('drafts.'.length) : oldId

  let nextBare: string
  if (bare.startsWith('expertise-')) {
    nextBare = `service-${bare.slice('expertise-'.length)}`
  } else if (bare.startsWith('expertise.')) {
    nextBare = `service.${bare.slice('expertise.'.length)}`
  } else if (bare.startsWith('expertiseIndexPage-')) {
    nextBare = `serviceIndexPage-${bare.slice('expertiseIndexPage-'.length)}`
  } else if (bare.startsWith('expertiseIndexPage.')) {
    nextBare = `serviceIndexPage.${bare.slice('expertiseIndexPage.'.length)}`
  } else {
    // UUID or other random — generate a fresh one.
    nextBare = randomUUID()
  }
  return isDraft ? `drafts.${nextBare}` : nextBare
}

async function run() {
  console.log(`${tag} starting migration\n`)

  // 1. Discover old docs + plan new ids.
  const oldExpertise = await client.fetch<AnyDoc[]>(`*[_type == "expertise"]`)
  const oldIndex = await client.fetch<AnyDoc[]>(`*[_type == "expertiseIndexPage"]`)

  if (oldExpertise.length === 0 && oldIndex.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  const idMap = new Map<string, string>()
  for (const d of oldExpertise) idMap.set(d._id, planNewId(d._id))
  for (const d of oldIndex) idMap.set(d._id, planNewId(d._id))

  console.log(`Doc-id remap (${idMap.size} docs):`)
  for (const [k, v] of idMap) console.log(`  ${k}  →  ${v}`)

  // 2. Discover all docs that reference the old ids.
  const referrers = await client.fetch<AnyDoc[]>(`*[references($ids)]`, {ids: [...idMap.keys()]})
  console.log(`\nReferring docs (${referrers.length}):`)
  for (const r of referrers) console.log(`  ${r._type}  ${r._id}`)

  if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to write the changes.')
    return
  }

  // ---- Step A: create new docs at new ids ----
  // serviceIndexPage docs reference expertise docs (pillars[]) — those refs
  // need rewriting before the doc is created.
  {
    const tx = client.transaction()
    let count = 0
    for (const d of oldExpertise) {
      const {_id, _type, _rev, _createdAt, _updatedAt, ...rest} = d
      const newId = idMap.get(_id)!
      const rewritten = rewriteRefs(rest, idMap)
      tx.create({...rewritten, _id: newId, _type: 'service'})
      count++
    }
    for (const d of oldIndex) {
      const {_id, _type, _rev, _createdAt, _updatedAt, ...rest} = d
      const newId = idMap.get(_id)!
      const rewritten = rewriteRefs(rest, idMap)
      tx.create({...rewritten, _id: newId, _type: 'serviceIndexPage'})
      count++
    }
    await tx.commit({visibility: 'async'})
    console.log(`\n[A] created ${count} new doc(s) at new ids`)
  }

  // ---- Step B: rewrite refs in every referring doc ----
  let workPatched = 0
  let contactPatched = 0
  let jobPatched = 0
  let otherPatched = 0
  {
    const tx = client.transaction()
    for (const doc of referrers) {
      // Build a patch per doc.
      if (doc._type === 'work') {
        const expertises = (doc as AnyDoc).expertises
        if (Array.isArray(expertises)) {
          const services = rewriteRefs(expertises, idMap)
          tx.patch(doc._id, (p) => p.set({services}).unset(['expertises']))
          workPatched++
        }
      } else if (doc._type === 'contactPage') {
        const arr = (doc as AnyDoc).expertiseContacts
        if (Array.isArray(arr)) {
          const renamed = arr.map((entry) => {
            if (!isRecord(entry)) return entry
            const {expertise, ...rest} = entry
            const out: Record<string, unknown> = rewriteRefs(rest, idMap) as Record<string, unknown>
            if (expertise) out.service = rewriteRefs(expertise, idMap)
            return out
          })
          tx.patch(doc._id, (p) => p.set({serviceContacts: renamed}).unset(['expertiseContacts']))
          contactPatched++
        }
      } else if (doc._type === 'job') {
        const expertise = (doc as AnyDoc).expertise
        if (isRef(expertise)) {
          const service = rewriteRefs(expertise, idMap)
          tx.patch(doc._id, (p) => p.set({service}).unset(['expertise']))
          jobPatched++
        }
      } else if (doc._type === 'translation.metadata') {
        const schemaTypes = (doc as AnyDoc).schemaTypes
        const translations = (doc as AnyDoc).translations
        const set: Record<string, unknown> = {}
        if (Array.isArray(schemaTypes)) {
          const next = schemaTypes.map((s) => (typeof s === 'string' && TYPE_MAP[s] ? TYPE_MAP[s] : s))
          if (JSON.stringify(next) !== JSON.stringify(schemaTypes)) set.schemaTypes = next
        }
        const nextTranslations = rewriteRefs(translations, idMap)
        if (JSON.stringify(nextTranslations) !== JSON.stringify(translations)) set.translations = nextTranslations
        if (Object.keys(set).length > 0) {
          tx.patch(doc._id, (p) => p.set(set))
          otherPatched++
        }
      } else {
        // Generic deep-rewrite — covers menu (items[].internal), translation.metadata
        // (translations[].value), and the still-old expertiseIndexPage that will
        // be deleted in step C anyway (we still patch it so its refs point at
        // the new ids should the delete fail and a retry be needed).
        const {_id, _type, _rev, _createdAt, _updatedAt, ...rest} = doc as AnyDoc
        const rewritten = rewriteRefs(rest, idMap) as Record<string, unknown>
        // Only touch fields that actually changed — find top-level fields that
        // differ between rest and rewritten.
        const set: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(rewritten)) {
          if (JSON.stringify((rest as Record<string, unknown>)[k]) !== JSON.stringify(v)) set[k] = v
        }
        if (Object.keys(set).length > 0) {
          tx.patch(_id, (p) => p.set(set))
          otherPatched++
        }
      }
    }
    await tx.commit({visibility: 'async'})
    console.log(
      `[B] rewrote refs — work:${workPatched}, contactPage:${contactPatched}, job:${jobPatched}, other:${otherPatched}`,
    )
  }

  // ---- Step C: delete the old docs ----
  {
    const tx = client.transaction()
    for (const oldId of idMap.keys()) tx.delete(oldId)
    await tx.commit({visibility: 'async'})
    console.log(`[C] deleted ${idMap.size} old doc(s)`)
  }

  console.log('\nDone.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
