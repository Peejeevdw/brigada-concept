/**
 * Minimal Recruitee API client used by `sync-jobs.ts`. Mirrors the surface
 * we need: list active offers, then fetch each offer per locale to get
 * the full description/requirements HTML.
 *
 * Auth is a Bearer token; URL shape is `{base}/c/{companyId}/{endpoint}`.
 */

export type RecruiteeOfferSummary = {
  id: number
  title: string
  slug: string
  status: string
  lang_code: string
}

export type RecruiteeOffer = RecruiteeOfferSummary & {
  description: string | null
  requirements: string | null
  published_at: string | null
  department_id: number | string | null
  postal_code: string | null
  offer_tags?: string[]
}

export type RecruiteeConfig = {
  baseUrl: string
  companyId: string
  token: string
}

function buildUrl(config: RecruiteeConfig, endpoint: string, params?: Record<string, string>) {
  const base = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`
  const withC = base.endsWith('c/') ? base : `${base}c/`
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = new URL(`${withC}${config.companyId}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }
  return url.toString()
}

async function request<T>(config: RecruiteeConfig, endpoint: string, params?: Record<string, string>): Promise<T> {
  const res = await fetch(buildUrl(config, endpoint, params), {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.token}`,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Recruitee ${endpoint} failed (${res.status}): ${body.slice(0, 200)}`)
  }
  return (await res.json()) as T
}

export async function fetchOffers(config: RecruiteeConfig): Promise<RecruiteeOfferSummary[]> {
  const data = await request<{offers: RecruiteeOfferSummary[]}>(config, 'offers', {
    kind: 'job',
    scope: 'active',
    view_mode: 'brief',
  })
  return (data.offers ?? []).filter((o) => o.status === 'published')
}

export async function fetchOffer(
  config: RecruiteeConfig,
  id: number | string,
  locale?: string,
): Promise<RecruiteeOffer | null> {
  try {
    const data = await request<{offer: RecruiteeOffer}>(
      config,
      `offers/${id}`,
      locale ? {lang_code: locale} : undefined,
    )
    return data.offer ?? null
  } catch (err) {
    console.warn(`[recruitee] fetchOffer(${id}, ${locale}) failed:`, (err as Error).message)
    return null
  }
}
