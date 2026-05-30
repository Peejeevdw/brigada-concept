import {type ChangeEvent, useCallback, useRef, useState} from 'react'
import {type ObjectSchemaType, useClient, useEditState} from 'sanity'
import {API_VERSION} from '../schemaTypes/helpers'
import {useRouter} from 'sanity/router'
import {
  Box,
  Button,
  Card,
  Flex,
  Popover,
  Spinner,
  Stack,
  Text,
  TextInput,
  useClickOutsideEvent,
} from '@sanity/ui'
import {TranslateIcon} from '@sanity/icons'
import {
  useDocumentInternationalizationContext,
  type Language,
} from '@sanity/document-internationalization'
import {LANGUAGE_FIELD_NAME} from 'sanity-plugin-internationalized-array'
import {uuid} from '@sanity/uuid'
import {useTranslationMetadata} from './translation/useTranslationMetadata'
import {LanguageButton} from './translation/LanguageButton'

const METADATA_TYPE = 'translation.metadata'
const TRANSLATIONS_ARRAY = 'translations'

const SEARCH_THRESHOLD = 4

function createReference(
  language: string,
  ref: string,
  typeName: string,
  strengthenOnPublish: boolean,
) {
  return {
    [LANGUAGE_FIELD_NAME]: language,
    _type: 'internationalizedArrayReferenceValue',
    value: {
      _type: 'reference',
      _ref: ref,
      ...(strengthenOnPublish
        ? {
            _weak: true,
            _strengthenOnPublish: {
              type: typeName,
              template: {id: `${typeName}-by-locale`},
            },
          }
        : {}),
    },
  }
}

function removeExcludedFields(
  doc: Record<string, unknown>,
  schemaType: ObjectSchemaType,
): Record<string, unknown> {
  const result = {...doc}
  for (const field of schemaType.fields) {
    const opts = (field.type as {options?: {documentInternationalization?: {exclude?: boolean}}})
      ?.options?.documentInternationalization
    if (opts?.exclude) {
      delete result[field.name]
    }
  }
  return result
}

interface FilteredLanguageMenuProps {
  schemaType: ObjectSchemaType
  documentId: string
}

export function FilteredLanguageMenu({documentId, schemaType}: FilteredLanguageMenuProps) {
  const {supportedLanguages, languageField, weakReferences, callback, apiVersion} =
    useDocumentInternationalizationContext()

  const client = useClient({apiVersion: apiVersion || API_VERSION})
  const {draft, published} = useEditState(documentId, schemaType.name)
  const source = draft || published
  const router = useRouter()

  const sourceLocale =
    typeof source?.[languageField] === 'string' ? (source[languageField] as string) : undefined

  const cleanDocId = documentId.replace(/^drafts\./, '')
  const {metadata, loading, error: fetchError} = useTranslationMetadata(documentId, apiVersion)
  const metadataId = metadata?._id || `translation.metadata.${cleanDocId}`

  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useClickOutsideEvent(
    () => setOpen(false),
    () => [buttonRef.current, popoverRef.current],
  )

  const navigateToDocument = useCallback(
    (id: string) => {
      const r = router as unknown as Record<string, unknown>
      if (typeof r.navigateIntent === 'function') {
        r.navigateIntent('edit', {id, type: schemaType.name})
      } else if (typeof r.resolveIntentLink === 'function') {
        const url = (
          r.resolveIntentLink as (intent: string, params: Record<string, string>) => string
        )('edit', {id, type: schemaType.name})
        if (typeof r.navigateUrl === 'function') {
          ;(r.navigateUrl as (url: string) => void)(url)
        }
      }
    },
    [router, schemaType.name],
  )

  const handleCreate = useCallback(
    async (language: Language) => {
      if (!source || !sourceLocale) return
      setCreating(language.id)
      try {
        const tx = client.transaction()
        const newDocId = uuid()

        let newDoc: Record<string, unknown> = {
          ...source,
          _id: `drafts.${newDocId}`,
          _type: schemaType.name,
          [languageField]: language.id,
        }
        delete newDoc._rev
        delete newDoc._updatedAt
        delete newDoc._createdAt
        newDoc = removeExcludedFields(newDoc, schemaType)
        tx.create(newDoc as Parameters<typeof tx.create>[0])

        const sourceRef = createReference(
          sourceLocale,
          cleanDocId,
          schemaType.name,
          !weakReferences,
        )
        const newRef = createReference(language.id, newDocId, schemaType.name, !weakReferences)

        tx.createIfNotExists({
          _id: metadataId,
          _type: METADATA_TYPE,
          schemaTypes: [schemaType.name],
          [TRANSLATIONS_ARRAY]: [sourceRef],
        })

        tx.patch(metadataId, (patch) =>
          patch
            .setIfMissing({[TRANSLATIONS_ARRAY]: [sourceRef]})
            .insert('after', `${TRANSLATIONS_ARRAY}[-1]`, [newRef]),
        )

        await tx.commit()

        if (callback) {
          await callback({
            client,
            sourceLanguageId: sourceLocale,
            sourceDocument: source as Parameters<typeof callback>[0]['sourceDocument'],
            newDocument: newDoc as Parameters<typeof callback>[0]['newDocument'],
            destinationLanguageId: language.id,
            metaDocumentId: metadataId,
          })
        }

        navigateToDocument(newDocId)
      } catch (err) {
        console.error('Error creating translation:', err)
      } finally {
        setCreating(null)
      }
    },
    [
      source,
      sourceLocale,
      client,
      languageField,
      weakReferences,
      schemaType,
      cleanDocId,
      metadataId,
      callback,
      navigateToDocument,
    ],
  )

  const displayLanguages = supportedLanguages.filter((lang) =>
    searchQuery ? lang.title.toLowerCase().includes(searchQuery.toLowerCase()) : true,
  )

  const popoverContent = (
    <Box padding={1}>
      {fetchError ? (
        <Card tone="critical" padding={3}>
          <Text size={1}>Could not load the linked language versions.</Text>
        </Card>
      ) : !sourceLocale ? (
        <Box padding={3}>
          <Text muted size={1}>
            Save this language version first to create or open translations.
          </Text>
        </Box>
      ) : (
        <Stack space={1}>
          {displayLanguages.length > SEARCH_THRESHOLD && (
            <TextInput
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.currentTarget.value)}
              value={searchQuery}
              placeholder="Filter languages"
            />
          )}
          {loading ? (
            <Flex padding={3} justify="center">
              <Spinner />
            </Flex>
          ) : (
            <>
              {displayLanguages.map((language) => {
                const translation = metadata?.translations?.find(
                  (t) => t[LANGUAGE_FIELD_NAME] === language.id,
                )
                return (
                  <LanguageButton
                    key={language.id}
                    language={language}
                    isCurrent={language.id === sourceLocale}
                    existingRef={translation?.value?._ref}
                    isCreating={creating === language.id}
                    disabled={loading}
                    onOpen={navigateToDocument}
                    onCreate={handleCreate}
                  />
                )
              })}
              {displayLanguages.length === 0 && (
                <Card padding={3}>
                  <Text muted size={1}>
                    No language versions available.
                  </Text>
                </Card>
              )}
            </>
          )}
        </Stack>
      )}
    </Box>
  )

  return (
    <Popover
      animate
      constrainSize
      content={popoverContent}
      open={open}
      portal
      ref={popoverRef}
      overflow="auto"
      tone="default"
    >
      <Button
        text="Language versions"
        mode="bleed"
        disabled={!source}
        icon={TranslateIcon}
        onClick={() => setOpen((o) => !o)}
        ref={buttonRef}
        selected={open}
      />
    </Popover>
  )
}
