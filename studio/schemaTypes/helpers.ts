import {
  defineArrayMember,
  defineField,
  type FieldDefinition,
  type FieldGroupDefinition,
} from 'sanity'
import {LocaleSlugInput} from '../components/LocaleSlugInput'

/** Sanity API version shared by plugins, queries, and custom components. */
export const API_VERSION = '2026-04-08'

/**
 * Shared field groups applied across the studio's documents.
 */

/** Two-tab layout for page singletons (Home / About / Careers / Contact). */
export const PAGE_GROUPS: FieldGroupDefinition[] = [
  {name: 'general', title: 'General', default: true},
  {name: 'content', title: 'Content'},
]

/** Three-tab layout for editorial resources (Expertise). */
export const RESOURCE_GROUPS: FieldGroupDefinition[] = [
  {name: 'general', title: 'General', default: true},
  {name: 'content', title: 'Content'},
  {name: 'settings', title: 'Settings'},
]

/** Work-specific tabs — case studies have a "story" set of long-form blocks. */
export const WORK_GROUPS: FieldGroupDefinition[] = [
  {name: 'general', title: 'General', default: true},
  {name: 'content', title: 'Case story'},
  {name: 'related', title: 'Related'},
]

/** Location-specific tabs — the address and contact details split cleanly. */
export const LOCATION_GROUPS: FieldGroupDefinition[] = [
  {name: 'general', title: 'General', default: true},
  {name: 'address', title: 'Address'},
  {name: 'contact', title: 'Contact'},
]

/**
 * Hidden+readonly `locale` field that `@sanity/document-internationalization`
 * writes the locale code into. Every document-level i18n schema needs it.
 */
export function localeField() {
  return defineField({
    name: 'locale',
    type: 'string',
    readOnly: true,
    hidden: true,
  })
}

/**
 * Slug field with the `/locale` prefix badge and a locale-scoped uniqueness
 * check. Pass `docType` to enable the GROQ probe; pass `scopeField: 'locale'`
 * so two locales of the same page can share a slug.
 */
export function slugField(options?: {
  group?: string
  source?: string
  docType?: string
  scopeField?: string
  description?: string
}) {
  return defineField({
    name: 'slug',
    title: 'Slug',
    type: 'slug',
    group: options?.group,
    description: options?.description,
    components: {input: LocaleSlugInput},
    validation: (Rule) => Rule.required().error('A slug is needed to build the page URL.'),
    options: {
      source: options?.source ?? 'title',
      maxLength: 96,
      ...(options?.docType
        ? {
            isUnique: async (slug, context) => {
              const {document, getClient} = context
              const client = getClient({apiVersion: API_VERSION})
              const id = document?._id?.replace(/^drafts\./, '') ?? ''
              if (!id) return true
              const scopeFilter = options.scopeField
                ? ` && ${options.scopeField} == $scopeValue`
                : ''
              const scopeValue = options.scopeField
                ? ((document as Record<string, unknown>)?.[options.scopeField] ?? '')
                : ''
              try {
                const count = await client.fetch<number>(
                  `count(*[_type == "${options.docType}" && slug.current == $slug${scopeFilter} && !(_id in [$id, $draftId])])`,
                  {slug, scopeValue, id, draftId: `drafts.${id}`},
                )
                return count === 0
              } catch (error) {
                console.error(`Slug uniqueness check failed for ${options.docType}:`, error)
                return true
              }
            },
          }
        : {}),
    },
  })
}

/**
 * The PageBuilder field shared by every page singleton and by the four
 * story sections inside Work (brief / approach / context / outcome).
 *
 * Adding a new block type only needs to happen here — every consumer picks
 * it up automatically.
 */
export function pageBuilderField(options?: {
  name?: string
  title?: string
  group?: string
  description?: string
}): FieldDefinition<'array'> {
  return defineField({
    name: options?.name ?? 'pageBuilder',
    title: options?.title ?? 'Page builder',
    type: 'array',
    group: options?.group,
    description:
      options?.description ??
      'Stack blocks to build the page. Drag to reorder. Each block has its own settings.',
    of: [
      defineArrayMember({type: 'richText'}),
      defineArrayMember({type: 'sectionImage'}),
      defineArrayMember({type: 'imageGrid'}),
      defineArrayMember({type: 'videoEmbed'}),
      defineArrayMember({type: 'quote'}),
      defineArrayMember({type: 'statBlock'}),
    ],
  })
}

/** Resolve an internationalized array's English value (or first non-empty fallback). */
export function resolveI18nValue(
  values: {_key: string; value: string}[] | undefined,
  fallback = 'Untitled',
): string {
  return values?.find((v) => v._key === 'en')?.value ?? values?.[0]?.value ?? fallback
}

/**
 * Preview prepare for documents whose `title` is an internationalizedArrayString
 * (e.g. locale, location).
 */
export function i18nTitlePreview(options?: {
  extraSelect?: Record<string, string>
  subtitleField?: string
}) {
  return {
    select: {title: 'title', ...options?.extraSelect},
    prepare(selection: Record<string, unknown>) {
      const title = resolveI18nValue(selection.title as {_key: string; value: string}[] | undefined)
      const subtitleField = options?.subtitleField
      const subtitle = subtitleField ? (selection[subtitleField] as string | undefined) : undefined
      return {title, subtitle}
    },
  }
}

/** Preview prepare for internationalizedArray labels (e.g. nav items, link items). */
export function i18nLabelPreview() {
  return {
    select: {label: 'label'},
    prepare({label}: {label?: {_key: string; value: string}[]}) {
      return {title: resolveI18nValue(label)}
    },
  }
}

export function languageVersionSubtitle(locale?: string, detail?: string) {
  return [locale?.toUpperCase() || 'No language', detail].filter(Boolean).join(' · ')
}

/** Preview for a per-locale singleton whose title is fixed (e.g. "Home page"). */
export function localePreview(title: string) {
  return {
    select: {locale: 'locale'},
    prepare({locale}: {locale?: string}) {
      return {title, subtitle: locale?.toUpperCase() || 'No locale'}
    },
  }
}

/** Preview for a per-locale document whose own `title` field is the display title. */
export function documentLocalePreview() {
  return {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}: {title?: string; locale?: string}) {
      return {title: title || 'Untitled', subtitle: locale?.toUpperCase() || 'No locale'}
    },
  }
}
