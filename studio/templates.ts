import type {Template} from 'sanity'
import {LOCALIZED_TYPES} from './structure/constants'

const TEMPLATE_TITLES: Record<string, string> = {
  homePage: 'Home page',
  aboutPage: 'About page',
  careersPage: 'Careers page',
  contactPage: 'Contact page',
  privacyPage: 'Privacy page',
  siteSettings: 'Site settings',
  work: 'Work case',
  serviceCategory: 'Service category',
  person: 'Person',
  job: 'Job',
}

function localeTemplate(schemaType: string, title: string): Template {
  return {
    id: `${schemaType}-by-locale`,
    title,
    schemaType,
    parameters: [{name: 'locale', type: 'string'}],
    value: (params: {locale: string}) => ({locale: params.locale}),
  }
}

function humanize(type: string) {
  // Fallback for types that do not have an explicit editor-facing title.
  return type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

/**
 * One `${type}-by-locale` template per localized type — singletons AND
 * non-singleton localized documents (work, serviceCategory, person). The
 * FilteredLanguageMenu references these by id when strengthening
 * weak translation references on publish.
 */
export const localeSingletonTemplates: Template[] = LOCALIZED_TYPES.map((type) =>
  localeTemplate(type, TEMPLATE_TITLES[type] ?? humanize(type)),
)
