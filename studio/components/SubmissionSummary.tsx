import {DocumentIcon} from '@sanity/icons'
import {Box, Button, Card, Code, Flex, Heading, Stack, Text} from '@sanity/ui'
import {useClient} from 'sanity'
import type {DocumentViewProps} from 'sanity/structure'
import {useEffect, useState} from 'react'

/**
 * Custom document view for `formSubmission` docs. The default Sanity form
 * renders every read-only field as a stacked input, which feels heavy for
 * what is essentially a static archive entry. This view prints the same
 * payload as a clean, typographic summary — no input chrome, just labels
 * and values + a metadata footer.
 *
 * This component is rendered as a view component (not inside the form
 * context), so the doc data arrives via `document.displayed` instead of
 * `useFormValue`.
 */

interface FormSubmissionDoc {
  kind?: string
  submittedAt?: string
  entries?: Entry[]
  meta?: Meta
  job?: JobRef
  attachments?: AttachmentItem[]
}

interface Entry {
  _key?: string
  name?: string
  label?: string
  value?: string
}

interface Meta {
  ip?: string
  userAgent?: string
  referer?: string
  turnstileVerdict?: string
}

interface JobRef {
  _ref?: string
}

interface AttachmentItem {
  _key?: string
  asset?: {_ref?: string}
}

interface ResolvedAsset {
  _id: string
  url: string
  originalFilename?: string
  size?: number
  mimeType?: string
}

const KIND_LABELS: Record<string, string> = {
  contact: 'Contact submission',
  'job-application': 'Job application',
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('nl-BE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SubmissionSummary(props: DocumentViewProps) {
  const doc = (props.document.displayed ?? {}) as FormSubmissionDoc
  const kind = doc.kind
  const submittedAt = doc.submittedAt
  const entries = doc.entries ?? []
  const meta = doc.meta ?? {}
  const job = doc.job
  const attachments = doc.attachments ?? []

  const client = useClient({apiVersion: '2026-04-08'})
  const [resolvedAssets, setResolvedAssets] = useState<ResolvedAsset[]>([])

  useEffect(() => {
    const refs = attachments.map((a) => a.asset?._ref).filter((r): r is string => Boolean(r))
    if (refs.length === 0) {
      setResolvedAssets([])
      return
    }
    let cancelled = false
    client
      .fetch<ResolvedAsset[]>(`*[_id in $refs]{_id, url, originalFilename, size, mimeType}`, {refs})
      .then((rows) => {
        if (!cancelled) setResolvedAssets(rows)
      })
      .catch(() => {
        if (!cancelled) setResolvedAssets([])
      })
    return () => {
      cancelled = true
    }
  }, [client, attachments])

  const kindLabel = kind ? KIND_LABELS[kind] ?? kind : 'Submission'

  return (
    <Box padding={4}>
      <Stack space={6}>
        {/* Header */}
        <Stack space={2}>
          <Text size={1} muted style={{textTransform: 'uppercase', letterSpacing: '0.1em'}}>
            {kindLabel}
          </Text>
          <Heading size={3} as="h1">
            {formatDate(submittedAt)}
          </Heading>
        </Stack>

        {/* Form data */}
        <Card padding={4} radius={2} shadow={1} tone="default">
          <Stack space={4}>
            {entries.length === 0 ? (
              <Text muted>No form data captured.</Text>
            ) : (
              entries.map((e, i) => {
                const value = (e.value ?? '').trim()
                const isMultiline = value.includes('\n')
                return (
                  <Stack key={e._key ?? `${e.name ?? 'field'}-${i}`} space={2}>
                    <Text
                      size={1}
                      muted
                      style={{textTransform: 'uppercase', letterSpacing: '0.1em'}}
                    >
                      {e.label || e.name || `Field ${i + 1}`}
                    </Text>
                    {value ? (
                      <Text
                        size={2}
                        style={
                          isMultiline
                            ? {whiteSpace: 'pre-wrap', lineHeight: 1.5}
                            : {lineHeight: 1.4}
                        }
                      >
                        {value}
                      </Text>
                    ) : (
                      <Text size={2} muted>
                        —
                      </Text>
                    )}
                  </Stack>
                )
              })
            )}
          </Stack>
        </Card>

        {/* Attachments */}
        {resolvedAssets.length > 0 && (
          <Stack space={3}>
            <Text size={1} muted style={{textTransform: 'uppercase', letterSpacing: '0.1em'}}>
              Attachments
            </Text>
            <Stack space={2}>
              {resolvedAssets.map((asset) => {
                const filename = asset.originalFilename || asset._id
                const sizeLabel = formatBytes(asset.size)
                return (
                  <Card key={asset._id} padding={3} radius={2} shadow={1}>
                    <Flex align="center" gap={3}>
                      <Box flex={1}>
                        <Stack space={1}>
                          <Text weight="medium">{filename}</Text>
                          <Text size={1} muted>
                            {[asset.mimeType, sizeLabel].filter(Boolean).join(' · ')}
                          </Text>
                        </Stack>
                      </Box>
                      <Button
                        as="a"
                        // @ts-expect-error — Button forwards anchor props but the
                        // generic type doesn't expose `href` directly.
                        href={`${asset.url}?dl=${encodeURIComponent(filename)}`}
                        rel="noopener noreferrer"
                        target="_blank"
                        text="Download"
                        icon={DocumentIcon}
                        tone="primary"
                        mode="ghost"
                      />
                    </Flex>
                  </Card>
                )
              })}
            </Stack>
          </Stack>
        )}

        {/* Job reference */}
        {job?._ref && (
          <Stack space={2}>
            <Text size={1} muted style={{textTransform: 'uppercase', letterSpacing: '0.1em'}}>
              Linked job
            </Text>
            <Code size={1}>{job._ref}</Code>
          </Stack>
        )}

        {/* Metadata */}
        {(meta.ip || meta.userAgent || meta.referer || meta.turnstileVerdict) && (
          <Stack space={3}>
            <Text size={1} muted style={{textTransform: 'uppercase', letterSpacing: '0.1em'}}>
              Metadata
            </Text>
            <Card padding={3} radius={2} tone="transparent">
              <Stack space={3}>
                {meta.turnstileVerdict && (
                  <Flex gap={3} align="flex-start">
                    <Box style={{width: 120, flexShrink: 0}}>
                      <Text size={1} muted>
                        Turnstile
                      </Text>
                    </Box>
                    <Text size={1}>{meta.turnstileVerdict}</Text>
                  </Flex>
                )}
                {meta.ip && (
                  <Flex gap={3} align="flex-start">
                    <Box style={{width: 120, flexShrink: 0}}>
                      <Text size={1} muted>
                        IP
                      </Text>
                    </Box>
                    <Text size={1}>
                      <Code size={1}>{meta.ip}</Code>
                    </Text>
                  </Flex>
                )}
                {meta.referer && (
                  <Flex gap={3} align="flex-start">
                    <Box style={{width: 120, flexShrink: 0}}>
                      <Text size={1} muted>
                        Referer
                      </Text>
                    </Box>
                    <Text size={1} style={{wordBreak: 'break-all'}}>
                      {meta.referer}
                    </Text>
                  </Flex>
                )}
                {meta.userAgent && (
                  <Flex gap={3} align="flex-start">
                    <Box style={{width: 120, flexShrink: 0}}>
                      <Text size={1} muted>
                        User agent
                      </Text>
                    </Box>
                    <Text size={1} style={{wordBreak: 'break-word'}}>
                      {meta.userAgent}
                    </Text>
                  </Flex>
                )}
              </Stack>
            </Card>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}
