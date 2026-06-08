/**
 * Recruitee → Sanity job sync.
 *
 * For every published Recruitee offer × every supported Sanity locale we
 * upsert a `job` document (deterministic ID `job.<locale>.<recruiteeId>`)
 * and maintain a `translation.metadata` doc linking the locale variants
 * so `@sanity/document-internationalization` recognises them.
 *
 * New jobs arrive as drafts (`drafts.job.<locale>.<recruiteeId>`) so an
 * editor can fill in the bits Recruitee does not supply (image, type,
 * intros, offer, contact, …) before publishing. On every later run we
 * patch wherever the doc lives — published, draft, or both.
 *
 * Sync-managed fields (overwritten every run): name, slug, recruiteeId,
 * publishDate, jobDescription, profile, location, serviceCategory.
 *
 * Editor-managed fields (only seeded on the first create, never touched
 * afterwards): image, type, introIndex, introDetail, offer, spotify,
 * contact, showOnHome, order.
 */

import {createClient, type SanityClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'

import {htmlToPortableText} from './htmlToPortableText'
import {fetchOffer, fetchOffers, type RecruiteeConfig, type RecruiteeOffer} from './recruitee'

loadEnv({path: new URL('../.env', import.meta.url).pathname})

const API_VERSION = '2026-04-08'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

type LocationRow = {_id: string; postalCode: string | null}
type CategoryRow = {_id: string; recruiteeId: string; locale: string | null}
type JobRow = {_id: string; recruiteeId: string; locale: string | null}

/** Lookup-table entry — bare doc id + whether it's draft-only. */
type Target = {id: string; isDraft: boolean}

function slugify(input: string | null | undefined): string {
  return (input ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

function jobIdFor(locale: string, recruiteeId: string | number): string {
  return `job.${locale}.${recruiteeId}`
}

function metadataIdFor(recruiteeId: string | number): string {
  return `translation.metadata.job-${recruiteeId}`
}

async function fetchSanityLocales(client: SanityClient): Promise<string[]> {
  const locales = await client.fetch<string[]>(
    `*[_type == "locale" && defined(localeId)] | order(orderRank asc).localeId`,
  )
  if (locales.length === 0) {
    console.warn('[sync-jobs] no locale documents found, falling back to ["en", "nl"]')
    return ['en', 'nl']
  }
  return locales
}

const stripDraft = (id: string) => id.replace(/^drafts\./, '')

/** Prefer the published variant when both published + draft exist. */
function preferPublished(prev: Target | undefined, next: Target): Target {
  if (!prev) return next
  if (prev.isDraft && !next.isDraft) return next
  return prev
}

async function fetchLocationsByPostalCode(client: SanityClient): Promise<Map<string, Target>> {
  const rows = await client.fetch<LocationRow[]>(
    `*[_type == "location" && defined(postalCode)]{_id, postalCode}`,
  )
  const map = new Map<string, Target>()
  for (const row of rows) {
    if (!row.postalCode) continue
    const target: Target = {id: stripDraft(row._id), isDraft: row._id.startsWith('drafts.')}
    map.set(row.postalCode, preferPublished(map.get(row.postalCode), target))
  }
  return map
}

async function fetchCategoriesByRecruiteeId(
  client: SanityClient,
): Promise<Map<string, Map<string, Target>>> {
  const rows = await client.fetch<ServiceRow[]>(
    `*[_type == "serviceCategory" && defined(recruiteeId)]{_id, recruiteeId, locale}`,
  )
  const map = new Map<string, Map<string, Target>>()
  for (const row of rows) {
    if (!row.recruiteeId) continue
    const inner = map.get(row.recruiteeId) ?? new Map<string, Target>()
    const key = row.locale ?? ''
    const target: Target = {id: stripDraft(row._id), isDraft: row._id.startsWith('drafts.')}
    inner.set(key, preferPublished(inner.get(key), target))
    map.set(row.recruiteeId, inner)
  }
  return map
}

function resolveCategory(
  byRecruiteeId: Map<string, Map<string, Target>>,
  departmentId: number | string | null | undefined,
  locale: string,
): Target | undefined {
  if (departmentId === null || departmentId === undefined) return undefined
  const inner = byRecruiteeId.get(String(departmentId))
  if (!inner) return undefined
  return inner.get(locale) ?? inner.values().next().value
}

/**
 * Build a reference whose strength matches the target's state:
 * - target already published → strong ref (matches the schema)
 * - target draft-only → weak ref + `_strengthenOnPublish` so the studio
 *   auto-strengthens once the editor publishes the target
 */
function refTo(target: Target, type: 'location' | 'serviceCategory') {
  const base = {_type: 'reference' as const, _ref: target.id}
  if (!target.isDraft) return base
  return {...base, _weak: true, _strengthenOnPublish: {type}}
}

type Ref = ReturnType<typeof refTo>

type SyncedFields = {
  name: string
  slug: {_type: 'slug'; current: string}
  recruiteeId: string
  publishDate: string | null
  jobDescription: unknown[]
  profile: unknown[]
  location: Ref | null
  serviceCategory: Ref | null
}

function buildSyncedFields(
  offer: RecruiteeOffer,
  locale: string,
  locationByPostal: Map<string, Target>,
  categoryByRecruiteeId: Map<string, Map<string, Target>>,
): SyncedFields {
  const locationTarget = offer.postal_code ? locationByPostal.get(offer.postal_code) : undefined
  const categoryTarget = resolveCategory(categoryByRecruiteeId, offer.department_id, locale)
  return {
    name: offer.title,
    slug: {_type: 'slug', current: slugify(offer.title)},
    recruiteeId: String(offer.id),
    publishDate: offer.published_at,
    jobDescription: htmlToPortableText(offer.description),
    profile: htmlToPortableText(offer.requirements),
    location: locationTarget ? refTo(locationTarget, 'location') : null,
    serviceCategory: categoryTarget ? refTo(categoryTarget, 'serviceCategory') : null,
  }
}

async function checkExistence(
  client: SanityClient,
  baseId: string,
): Promise<{published: boolean; draft: boolean}> {
  return client.fetch<{published: boolean; draft: boolean}>(
    `{"published": defined(*[_id == $pid][0]._id), "draft": defined(*[_id == $did][0]._id)}`,
    {pid: baseId, did: `drafts.${baseId}`},
  )
}

async function patchExisting(
  client: SanityClient,
  baseId: string,
  existing: {published: boolean; draft: boolean},
  patchFields: Record<string, unknown>,
  unsetFields: string[],
) {
  const tx = client.transaction()
  const applyPatch = (id: string) => {
    tx.patch(id, (p) => {
      let next = p.set(patchFields)
      if (unsetFields.length > 0) next = next.unset(unsetFields)
      return next
    })
  }
  if (existing.published) applyPatch(baseId)
  if (existing.draft) applyPatch(`drafts.${baseId}`)
  await tx.commit({visibility: 'async'})
}

async function upsertJobForLocale(
  client: SanityClient,
  offer: RecruiteeOffer,
  locale: string,
  locationByPostal: Map<string, Target>,
  categoryByRecruiteeId: Map<string, Map<string, Target>>,
  dryRun: boolean,
): Promise<void> {
  const baseId = jobIdFor(locale, offer.id)
  const synced = buildSyncedFields(offer, locale, locationByPostal, categoryByRecruiteeId)

  if (dryRun) {
    console.log(
      `[dry-run] upsert ${baseId} — name="${synced.name}", location=${synced.location?._ref ?? 'none'}, serviceCategory=${synced.serviceCategory?._ref ?? 'none'}`,
    )
    return
  }

  const existing = await checkExistence(client, baseId)

  if (!existing.published && !existing.draft) {
    // First-time create: arrive as a draft so editors can fill in image,
    // type, intros, contact, etc. before going live. Reference fields are
    // omitted when no match was found — the schema rejects `null`.
    const {location, serviceCategory, ...scalar} = synced
    const doc = {
      _id: `drafts.${baseId}`,
      _type: 'job' as const,
      locale,
      showOnHome: false,
      order: 100,
      ...scalar,
      ...(location ? {location} : {}),
      ...(serviceCategory ? {serviceCategory} : {}),
    }
    await client.create(doc)
    return
  }

  const patchFields: Record<string, unknown> = {
    name: synced.name,
    slug: synced.slug,
    recruiteeId: synced.recruiteeId,
    publishDate: synced.publishDate,
    jobDescription: synced.jobDescription,
    profile: synced.profile,
  }
  const unsetFields: string[] = []
  if (synced.location) patchFields.location = synced.location
  else unsetFields.push('location')
  if (synced.serviceCategory) patchFields.serviceCategory = synced.serviceCategory
  else unsetFields.push('serviceCategory')

  await patchExisting(client, baseId, existing, patchFields, unsetFields)
}

async function upsertTranslationMetadata(
  client: SanityClient,
  recruiteeId: number,
  locales: string[],
  dryRun: boolean,
): Promise<void> {
  const baseId = metadataIdFor(recruiteeId)
  const translations = locales.map((locale) => ({
    _key: locale,
    value: {
      _type: 'reference',
      _ref: jobIdFor(locale, recruiteeId),
      // Weak so the metadata stays valid while the target jobs are still
      // drafts (a strong ref needs a published target).
      _weak: true,
    },
  }))

  if (dryRun) {
    console.log(`[dry-run] upsert ${baseId} (${locales.length} locales)`)
    return
  }

  const existing = await checkExistence(client, baseId)
  const targetId = existing.published ? baseId : `drafts.${baseId}`
  await client.createOrReplace({
    _id: targetId,
    _type: 'translation.metadata',
    schemaTypes: ['job'],
    translations,
  })
  // Keep a published copy in lockstep if both exist.
  if (existing.published && existing.draft) {
    await client.createOrReplace({
      _id: `drafts.${baseId}`,
      _type: 'translation.metadata',
      schemaTypes: ['job'],
      translations,
    })
  }
}

async function deleteOrphanedJobs(
  client: SanityClient,
  activeRecruiteeIds: Set<string>,
  dryRun: boolean,
): Promise<number> {
  const rows = await client.fetch<JobRow[]>(
    `*[_type == "job" && defined(recruiteeId)]{_id, recruiteeId, locale}`,
  )
  const toDelete = rows.filter((row) => !activeRecruiteeIds.has(row.recruiteeId))
  if (toDelete.length === 0) return 0

  const orphanRecruiteeIds = new Set(toDelete.map((row) => row.recruiteeId))

  if (dryRun) {
    for (const row of toDelete) console.log(`[dry-run] delete ${row._id}`)
    for (const id of orphanRecruiteeIds) console.log(`[dry-run] delete ${metadataIdFor(id)}`)
    return toDelete.length
  }

  const tx = client.transaction()
  for (const row of toDelete) {
    tx.delete(row._id)
    tx.delete(`drafts.${row._id}`)
  }
  for (const id of orphanRecruiteeIds) {
    tx.delete(metadataIdFor(id))
    tx.delete(`drafts.${metadataIdFor(id)}`)
  }
  await tx.commit({visibility: 'async'})
  return toDelete.length
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const recruiteeConfig: RecruiteeConfig = {
    baseUrl: required('RECRUITEE_API_URL'),
    companyId: required('RECRUITEE_COMPANY_ID'),
    token: required('RECRUITEE_API_TOKEN'),
  }

  const client = createClient({
    projectId: required('SANITY_STUDIO_PROJECT_ID'),
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
    apiVersion: API_VERSION,
    token: required('SANITY_API_WRITE_TOKEN'),
    useCdn: false,
    // `raw` so existence checks see drafts by their literal `drafts.*` id;
    // the default `drafts` perspective rewrites ids and would hide them.
    perspective: 'raw',
  })

  console.log(`[sync-jobs] mode=${dryRun ? 'dry-run' : 'apply'}`)

  const [locales, locationByPostal, categoryByRecruiteeId, recruiteeOffers] = await Promise.all([
    fetchSanityLocales(client),
    fetchLocationsByPostalCode(client),
    fetchCategoriesByRecruiteeId(client),
    fetchOffers(recruiteeConfig),
  ])

  console.log(
    `[sync-jobs] locales=[${locales.join(', ')}] locations=${locationByPostal.size} serviceCategories=${categoryByRecruiteeId.size} offers=${recruiteeOffers.length}`,
  )

  const activeRecruiteeIds = new Set<string>()

  for (const summary of recruiteeOffers) {
    activeRecruiteeIds.add(String(summary.id))
    const completedLocales: string[] = []
    try {
      // Recruitee returns the offer in every locale even if only one was
      // actually translated — empty title means "no source content here".
      // Brigada writes vacancies in Dutch first, so NL is the fallback when
      // a target locale has no content of its own.
      const fallbackLocale = 'nl'
      let fallbackOffer: Awaited<ReturnType<typeof fetchOffer>> | undefined
      const getFallbackOffer = async () => {
        if (fallbackOffer !== undefined) return fallbackOffer
        fallbackOffer = await fetchOffer(recruiteeConfig, summary.id, fallbackLocale)
        return fallbackOffer
      }

      for (const locale of locales) {
        let offer = await fetchOffer(recruiteeConfig, summary.id, locale)
        if ((!offer || !offer.title) && locale !== fallbackLocale) {
          const fb = await getFallbackOffer()
          if (fb?.title) {
            console.log(
              `[sync-jobs] offer ${summary.id} (locale ${locale}) empty in source, using ${fallbackLocale} fallback`,
            )
            offer = fb
          }
        }
        if (!offer || !offer.title) {
          console.warn(`[sync-jobs] offer ${summary.id} (locale ${locale}) has no content, skipping`)
          continue
        }
        await upsertJobForLocale(
          client,
          offer,
          locale,
          locationByPostal,
          categoryByRecruiteeId,
          dryRun,
        )
        completedLocales.push(locale)
      }
      if (completedLocales.length > 0) {
        await upsertTranslationMetadata(client, summary.id, completedLocales, dryRun)
      } else {
        console.warn(`[sync-jobs] offer ${summary.id} has no content in any supported locale`)
      }
    } catch (err) {
      console.error(`[sync-jobs] failed for offer ${summary.id}:`, (err as Error).message)
    }
  }

  const deleted = await deleteOrphanedJobs(client, activeRecruiteeIds, dryRun)
  console.log(`[sync-jobs] done — upserted ${recruiteeOffers.length} offer(s), removed ${deleted} orphan job(s)`)
}

main().catch((err) => {
  console.error('[sync-jobs] fatal:', err)
  process.exit(1)
})
