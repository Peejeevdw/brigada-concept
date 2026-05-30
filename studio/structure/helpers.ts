import type {Child, StructureBuilder} from 'sanity/structure'
import {TranslateIcon} from '@sanity/icons'
import {STATIC_LOCALES, type LocaleSingleton} from './constants'

/** Pin a per-locale document with a deterministic ID and an initial-value template. */
export function localeDocument(
  S: StructureBuilder,
  schemaType: LocaleSingleton,
  localeId: string,
): Child {
  return S.document()
    .schemaType(schemaType)
    .documentId(`${schemaType}-${localeId}`)
    .initialValueTemplate(`${schemaType}-by-locale`, {locale: localeId})
}

/**
 * Locale picker for a per-locale singleton. With a single locale, the picker is
 * skipped — the document opens directly.
 */
export function localePicker(S: StructureBuilder, schemaType: LocaleSingleton): Child {
  if (STATIC_LOCALES.length === 1) {
    return localeDocument(S, schemaType, STATIC_LOCALES[0].id)
  }
  return S.list()
    .title('Choose language')
    .items(
      STATIC_LOCALES.map((loc) =>
        S.listItem()
          .id(`${schemaType}-${loc.id}`)
          .title(loc.title)
          .icon(TranslateIcon)
          .child(localeDocument(S, schemaType, loc.id)),
      ),
    )
}
