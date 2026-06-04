/**
 * One-shot cleanup for orphan fields left behind after schema changes.
 *
 * Sanity's MCP layer refuses to unset paths that aren't in the deployed
 * schema, so the Studio shows "Unknown field found" with a manual Remove
 * Field button per doc. This script does the same via the write API.
 *
 * Add new entries to the `targets` table below for each round of schema
 * cleanups. Run from inside `studio/`:
 *
 *   pnpm tsx scripts/cleanup-orphan-fields.ts
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

interface CleanupTarget {
  /** Document ID to patch. Targets the published doc; drafts are picked up via discardDraft. */
  documentId: string
  /** Field paths to unset (relative to the document root). */
  paths: string[]
}

const targets: CleanupTarget[] = [
  // Removed when the page-builder was scoped to case detail only.
  {documentId: 'homePage-en', paths: ['pageBuilder', 'intro.paragraph']},
  {documentId: 'contactPage-en', paths: ['pageBuilder']},
  {documentId: 'privacyPage-en', paths: ['pageBuilder']},
  // Stray secondary homePage doc with the legacy paragraph still set.
  {documentId: '7edf9030-1909-47dc-86e2-384ff5e53d34', paths: ['pageBuilder', 'intro.paragraph']},
]

async function run() {
  let touched = 0
  for (const target of targets) {
    const doc = await client.fetch<Record<string, unknown> | null>(
      `*[_id == $id || _id == $draftId][0]`,
      {id: target.documentId, draftId: `drafts.${target.documentId}`},
    )
    if (!doc) {
      console.log(`· skip ${target.documentId} (not found)`)
      continue
    }
    console.log(`· unset on ${target.documentId}: ${target.paths.join(', ')}`)
    // Patch both the published doc and any existing draft so the orphan
    // disappears from both perspectives in Studio.
    await client.patch(target.documentId).unset(target.paths).commit({autoGenerateArrayKeys: false})
    try {
      await client
        .patch(`drafts.${target.documentId}`)
        .unset(target.paths)
        .commit({autoGenerateArrayKeys: false})
    } catch (e) {
      // No draft existed — fine, ignore.
      void e
    }
    touched += 1
  }
  console.log(`Done. Touched ${touched} document(s).`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
