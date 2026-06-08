/**
 * All singletons in the studio are scoped per-locale: one document per language,
 * pinned by deterministic ID `${type}-${localeId}`.
 */
export const LOCALE_SINGLETONS = [
  'homePage',
  'aboutPage',
  'careersPage',
  'contactPage',
  'privacyPage',
  'siteSettings',
] as const
export type LocaleSingleton = (typeof LOCALE_SINGLETONS)[number]

/** Subset of LOCALE_SINGLETONS listed under the desk's "Pages" section. */
export const PAGE_SINGLETONS = [
  'homePage',
  'aboutPage',
  'careersPage',
  'contactPage',
  'privacyPage',
] as const satisfies readonly LocaleSingleton[]
export type PageSingleton = (typeof PAGE_SINGLETONS)[number]

/** Runtime guard for `.includes(stringFromAnywhere)` call sites. */
export const isSingletonType = (type: string): boolean =>
  (LOCALE_SINGLETONS as readonly string[]).includes(type)

/** Non-singleton document types translated per locale (one document per locale). */
export const I18N_DOCUMENTS = ['work', 'service', 'person', 'job'] as const

/**
 * Every schema type managed by `@sanity/document-internationalization`.
 * Mutable because Sanity plugin options expect `string[]`.
 */
export const LOCALIZED_TYPES: string[] = [...LOCALE_SINGLETONS, ...I18N_DOCUMENTS]

/**
 * Active locales the Studio and FE operate on. The site is English-only for
 * now; the schema field shapes (internationalizedArrayString, localeField,
 * the per-locale singleton pattern, the locale document type) stay in place
 * so we can re-enable a second language by adding it back to this list and
 * the matching `locale` doc in Sanity.
 *
 * Mutable because Sanity plugin callbacks must return `Language[]`, not
 * readonly.
 */
export const STATIC_LOCALES: {id: string; title: string}[] = [
  {id: 'en', title: 'English'},
]
