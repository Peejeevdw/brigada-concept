/**
 * Rename Sanity data from the intermediate `service` schema (previously
 * renamed from `expertise`) to the final `serviceCategory` schema. Same
 * playbook as the first rename: new IDs + rewrite incoming refs +
 * translation.metadata hints, then delete the old docs.
 *
 * What it does:
 *   1. Discover every `_type == "service"` / "serviceIndexPage" doc (incl.
 *      drafts). Build oldId → newId map (friendly ids `service-X-en` →
 *      `serviceCategory-X-en`; UUID ids get a fresh UUID).
 *   2. Create new docs at the new ids with the new `_type` and refs
 *      rewritten (e.g. serviceCategoryIndexPage.pillars[]._ref).
 *   3. Rewrite incoming refs everywhere — work.services (→ serviceCategories),
 *      contactPage.serviceContacts (→ serviceCategoryContacts with inner
 *      service → serviceCategory), job.service (→ serviceCategory), menus,
 *      translation.metadata.
 *   4. Delete the old docs.
 *
 * Run order (REQUIRED):
 *   a. Deploy the new Studio schema first (so the `serviceCategory` /
 *      `serviceCategoryIndexPage` types exist in the deployed schema).
 *   b. Dry-run:   pnpm tsx scripts/migrate-service-to-service-category.ts
 *   c. Apply:     pnpm tsx scripts/migrate-service-to-service-category.ts --apply
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
  service: 'serviceCategory',
  serviceIndexPage: 'serviceCategoryIndexPage',
}
const TEMPLATE_MAP: Record<string, string> = {
  'service-by-locale': 'serviceCategory-by-locale',
}

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

function planNewId(oldId: string): string {
  const isDraft = oldId.startsWith('drafts.')
  const bare = isDraft ? oldId.slice('drafts.'.length) : oldId
  let nextBare: string
  if (bare.startsWith('service-')) {
    nextBare = `serviceCategory-${bare.slice('service-'.length)}`
  } else if (bare.startsWith('service.')) {
    nextBare = `serviceCategory.${bare.slice('service.'.length)}`
  } else if (bare.startsWith('serviceIndexPage-')) {
    nextBare = `serviceCategoryIndexPage-${bare.slice('serviceIndexPage-'.length)}`
  } else if (bare.startsWith('serviceIndexPage.')) {
    nextBare = `serviceCategoryIndexPage.${bare.slice('serviceIndexPage.'.length)}`
  } else {
    nextBare = randomUUID()
  }
  return isDraft ? `drafts.${nextBare}` : nextBare
}

async function run() {
  console.log(`${tag} starting migration\n`)

  const oldServices = await client.fetch<AnyDoc[]>(`*[_type == "service"]`)
  const oldIndex = await client.fetch<AnyDoc[]>(`*[_type == "serviceIndexPage"]`)

  if (oldServices.length === 0 && oldIndex.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  const idMap = new Map<string, string>()
  for (const d of oldServices) idMap.set(d._id, planNewId(d._id))
  for (const d of oldIndex) idMap.set(d._id, planNewId(d._id))

  console.log(`Doc-id remap (${idMap.size} docs):`)
  for (const [k, v] of idMap) console.log(`  ${k}  →  ${v}`)

  const referrers = await client.fetch<AnyDoc[]>(`*[references($ids)]`, {ids: [...idMap.keys()]})
  console.log(`\nReferring docs (${referrers.length}):`)
  for (const r of referrers) console.log(`  ${r._type}  ${r._id}`)

  if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to write the changes.')
    return
  }

  // ---- Step A: create new docs at new ids ----
  {
    const tx = client.transaction()
    let count = 0
    for (const d of oldServices) {
      const {_id, _type, _rev, _createdAt, _updatedAt, ...rest} = d
      const newId = idMap.get(_id)!
      const rewritten = rewriteRefs(rest, idMap)
      tx.create({...rewritten, _id: newId, _type: 'serviceCategory'})
      count++
    }
    for (const d of oldIndex) {
      const {_id, _type, _rev, _createdAt, _updatedAt, ...rest} = d
      const newId = idMap.get(_id)!
      const rewritten = rewriteRefs(rest, idMap)
      tx.create({...rewritten, _id: newId, _type: 'serviceCategoryIndexPage'})
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
      if (doc._type === 'work') {
        const services = (doc as AnyDoc).services
        if (Array.isArray(services)) {
          const serviceCategories = rewriteRefs(services, idMap)
          tx.patch(doc._id, (p) => p.set({serviceCategories}).unset(['services']))
          workPatched++
        }
      } else if (doc._type === 'contactPage') {
        const arr = (doc as AnyDoc).serviceContacts
        if (Array.isArray(arr)) {
          const renamed = arr.map((entry) => {
            if (!isRecord(entry)) return entry
            const {service, ...rest} = entry
            const out: Record<string, unknown> = rewriteRefs(rest, idMap) as Record<string, unknown>
            if (service) out.serviceCategory = rewriteRefs(service, idMap)
            return out
          })
          tx.patch(doc._id, (p) =>
            p.set({serviceCategoryContacts: renamed}).unset(['serviceContacts']),
          )
          contactPatched++
        }
      } else if (doc._type === 'job') {
        const service = (doc as AnyDoc).service
        if (isRef(service)) {
          const serviceCategory = rewriteRefs(service, idMap)
          tx.patch(doc._id, (p) => p.set({serviceCategory}).unset(['service']))
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
        // Generic deep-rewrite for menu / serviceIndexPage / etc.
        const {_id, _type, _rev, _createdAt, _updatedAt, ...rest} = doc as AnyDoc
        const rewritten = rewriteRefs(rest, idMap) as Record<string, unknown>
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

  // ---- Step C: delete old docs ----
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
