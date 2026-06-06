/**
 * Migrate existing case heroes from the old `caseMedia` object type to the new
 * `caseHeroMedia` type (added when the hero was split off so it can carry its
 * own 16:9 / 4:5 aspect-ratio notes).
 *
 * The hero's field shape is identical — only the `_type` marker changes — so the
 * front-end (which projects the hero by field name) is unaffected. This patch
 * just stops the Studio from showing a "type mismatch" on the hero of cases that
 * were created before the split.
 *
 * Run order: deploy the Studio first (so `caseHeroMedia` exists in the deployed
 * schema), then run this.
 *
 * Dry run (default — lists what would change, writes nothing):
 *   pnpm tsx scripts/migrate-hero-type.ts
 * Apply:
 *   pnpm tsx scripts/migrate-hero-type.ts --apply
 *
 * Requires SANITY_STUDIO_PROJECT_ID + SANITY_API_WRITE_TOKEN in studio/.env.
 */
import {createClient} from '@sanity/client'
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
})

const APPLY = process.argv.includes('--apply')

async function run() {
  // `raw` perspective so both published and draft (drafts.*) work docs are seen.
  const docs = await client.fetch<Array<{_id: string}>>(
    `*[_type == "work" && defined(hero) && hero._type == "caseMedia"]{_id}`,
    {},
    {perspective: 'raw'},
  )

  if (docs.length === 0) {
    console.log('Nothing to migrate — no work docs with hero._type == "caseMedia".')
    return
  }

  console.log(`${APPLY ? 'Migrating' : '[dry run] Would migrate'} ${docs.length} document(s):`)
  for (const doc of docs) {
    console.log(`  · ${doc._id}`)
    if (APPLY) {
      await client
        .patch(doc._id)
        .set({'hero._type': 'caseHeroMedia'})
        .commit({autoGenerateArrayKeys: false})
    }
  }

  console.log(APPLY ? 'Done.' : 'Dry run only — re-run with --apply to write the changes.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
