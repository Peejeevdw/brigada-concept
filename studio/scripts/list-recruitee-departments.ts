/**
 * Lists Recruitee departments alongside the current Sanity service docs,
 * so an editor can fill in `service.recruiteeId` and have the jobs sync
 * wire each job to the right pillar.
 *
 *   pnpm tsx scripts/list-recruitee-departments.ts
 *
 * Output is a table: Recruitee dept id + name + offers in that dept,
 * paired with the currently-mapped Sanity service (if any).
 */
import {createClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'

import {fetchOffers, type RecruiteeConfig} from './recruitee'

loadEnv({path: new URL('../.env', import.meta.url).pathname})

const API_VERSION = '2026-04-08'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

type Department = {id: number; name: string}
type OfferSummary = {id: number; title: string; department_id: number | null; lang_code: string}
type ServiceRow = {_id: string; name: string; locale: string | null; recruiteeId: string | null}

async function fetchDepartments(config: RecruiteeConfig): Promise<Department[]> {
  const base = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`
  const withC = base.endsWith('c/') ? base : `${base}c/`
  const url = `${withC}${config.companyId}/departments`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
  })
  if (!res.ok) throw new Error(`Recruitee departments failed (${res.status})`)
  const data = (await res.json()) as {departments: Department[]}
  return data.departments ?? []
}

async function fetchAllOffers(config: RecruiteeConfig): Promise<OfferSummary[]> {
  const base = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`
  const withC = base.endsWith('c/') ? base : `${base}c/`
  const url = new URL(`${withC}${config.companyId}/offers`)
  url.searchParams.set('kind', 'job')
  url.searchParams.set('scope', 'active')
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
  })
  if (!res.ok) throw new Error(`Recruitee offers failed (${res.status})`)
  const data = (await res.json()) as {offers: OfferSummary[]}
  return (data.offers ?? []).filter((o) => (o as unknown as {status: string}).status === 'published')
}

async function main() {
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
    perspective: 'raw',
  })

  const [departments, offers, services] = await Promise.all([
    fetchDepartments(recruiteeConfig),
    fetchAllOffers(recruiteeConfig),
    client.fetch<ServiceRow[]>(
      `*[_type == "service"]{_id, "name": coalesce(name[_key == "en"][0].value, name[0].value, _id), locale, recruiteeId} | order(name asc)`,
    ),
  ])

  const offersByDept = new Map<number, OfferSummary[]>()
  for (const o of offers) {
    if (o.department_id == null) continue
    const list = offersByDept.get(o.department_id) ?? []
    list.push(o)
    offersByDept.set(o.department_id, list)
  }

  const serviceByRecruiteeId = new Map<string, ServiceRow[]>()
  for (const e of services) {
    if (!e.recruiteeId) continue
    const list = serviceByRecruiteeId.get(e.recruiteeId) ?? []
    list.push(e)
    serviceByRecruiteeId.set(e.recruiteeId, list)
  }

  console.log('\n== Recruitee departments ==\n')
  for (const dept of departments) {
    const deptOffers = offersByDept.get(dept.id) ?? []
    const mapped = serviceByRecruiteeId.get(String(dept.id)) ?? []
    const mappedLabel =
      mapped.length > 0
        ? mapped.map((m) => `${m.name}${m.locale ? ` [${m.locale}]` : ''}`).join(', ')
        : '— (no Sanity service mapped)'
    console.log(`#${dept.id}  ${dept.name}`)
    console.log(`    sanity service: ${mappedLabel}`)
    if (deptOffers.length === 0) {
      console.log(`    offers: —`)
    } else {
      for (const o of deptOffers) {
        console.log(`    offer ${o.id}: ${o.title} [${o.lang_code}]`)
      }
    }
    console.log()
  }

  console.log('== Sanity service docs ==\n')
  for (const e of services) {
    const tag = e.locale ? ` [${e.locale}]` : ''
    const rid = e.recruiteeId ? ` → Recruitee dept ${e.recruiteeId}` : ' → (no recruiteeId set)'
    console.log(`${e._id}${tag}  ${e.name}${rid}`)
  }
  console.log()

  const unmapped = departments.filter((d) => !serviceByRecruiteeId.has(String(d.id)))
  if (unmapped.length > 0) {
    console.log(`Heads up: ${unmapped.length} Recruitee department(s) have no Sanity service mapped:`)
    for (const d of unmapped) console.log(`  - #${d.id} ${d.name}`)
    console.log(
      '\nFill `Recruitee department ID` on the matching service doc in Studio, then re-run pnpm sync:jobs.',
    )
  } else {
    console.log('All Recruitee departments are mapped to a service.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
