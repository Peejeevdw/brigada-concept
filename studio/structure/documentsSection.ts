import type {ComponentType} from 'react'
import {CaseIcon, StarIcon, UserIcon} from '@sanity/icons'
import type {StructureBuilder} from 'sanity/structure'
import {STATIC_LOCALES} from './constants'

const DEFAULT_DOCUMENT_LOCALE = STATIC_LOCALES[0]?.id ?? 'en'

const LOCALIZED_DOCUMENT_ITEMS: ReadonlyArray<{
  schemaType: string
  title: string
  icon: ComponentType
}> = [
  {schemaType: 'work', title: 'Work cases', icon: CaseIcon},
  {schemaType: 'expertise', title: 'Expertise', icon: StarIcon},
  {schemaType: 'job', title: 'Jobs', icon: CaseIcon},
  {schemaType: 'person', title: 'People', icon: UserIcon},
]

const FIELD_TRANSLATED_DOCUMENT_ITEMS: ReadonlyArray<{
  schemaType: string
  title: string
}> = [
  {schemaType: 'location', title: 'Offices'},
  {schemaType: 'menu', title: 'Menus'},
  {schemaType: 'translationNamespace', title: 'UI text translations'},
]

function localizedDocumentList(
  S: StructureBuilder,
  schemaType: string,
  title: string,
  icon: ComponentType,
) {
  return S.listItem()
    .id(schemaType)
    .title(title)
    .icon(icon)
    .child(
      S.documentTypeList(schemaType)
        .title(title)
        .filter('_type == $schemaType && (locale == $locale || !defined(locale))')
        .params({schemaType, locale: DEFAULT_DOCUMENT_LOCALE})
        .initialValueTemplates([
          S.initialValueTemplateItem(`${schemaType}-by-locale`, {
            locale: DEFAULT_DOCUMENT_LOCALE,
          }),
        ]),
    )
}

export function createDocumentsSection(S: StructureBuilder) {
  return [
    ...LOCALIZED_DOCUMENT_ITEMS.map(({schemaType, title, icon}) =>
      localizedDocumentList(S, schemaType, title, icon),
    ),
    ...FIELD_TRANSLATED_DOCUMENT_ITEMS.map(({schemaType, title}) =>
      S.documentTypeListItem(schemaType).id(schemaType).title(title),
    ),
  ]
}
