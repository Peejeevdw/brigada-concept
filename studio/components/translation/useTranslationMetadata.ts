import {useEffect, useState} from 'react'
import {useClient} from 'sanity'
import {API_VERSION} from '../../schemaTypes/helpers'
import type {MetadataDoc} from './types'

const METADATA_QUERY = `*[_type == "translation.metadata" && references($docId)][0]{
	_id, _createdAt,
	translations[]{ language, value { _ref, _weak } }
}`

const LISTEN_DEBOUNCE_MS = 150

interface Result {
  metadata: MetadataDoc | null
  loading: boolean
  error: boolean
}

/** Subscribes to the translation.metadata document for `documentId`, debouncing rapid mutations. */
export function useTranslationMetadata(documentId: string, apiVersion?: string): Result {
  const cleanDocId = documentId.replace(/^drafts\./, '')
  const client = useClient({apiVersion: apiVersion || API_VERSION})

  const [metadata, setMetadata] = useState<MetadataDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const params = {docId: cleanDocId}

    let cancelled = false
    let refetchToken = 0
    let pendingTimer: ReturnType<typeof setTimeout> | null = null

    const runFetch = () => {
      const token = ++refetchToken
      return client
        .fetch<MetadataDoc | null>(METADATA_QUERY, params)
        .then((result) => {
          if (cancelled || token !== refetchToken) return
          setMetadata(result)
          setLoading(false)
        })
        .catch((err) => {
          if (cancelled || token !== refetchToken) return
          console.error('Failed to fetch translation metadata:', err)
          setLoading(false)
          setError(true)
        })
    }

    runFetch()

    const sub = client.listen(METADATA_QUERY, params, {visibility: 'query'}).subscribe({
      next: () => {
        if (pendingTimer) clearTimeout(pendingTimer)
        pendingTimer = setTimeout(runFetch, LISTEN_DEBOUNCE_MS)
      },
    })

    return () => {
      cancelled = true
      if (pendingTimer) clearTimeout(pendingTimer)
      sub.unsubscribe()
    }
  }, [client, cleanDocId])

  return {metadata, loading, error}
}
