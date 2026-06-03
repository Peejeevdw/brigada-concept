import {defineConfig, type ObjectSchemaType} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool, defineLocations} from 'sanity/presentation'
import {visionTool} from '@sanity/vision'
import {documentInternationalization} from '@sanity/document-internationalization'
import {internationalizedArray} from 'sanity-plugin-internationalized-array'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {LOCALIZED_TYPES, STATIC_LOCALES, isSingletonType} from './structure/constants'
import {localeSingletonTemplates} from './templates'
import {FilteredLanguageMenu} from './components/FilteredLanguageMenu'
import {API_VERSION} from './schemaTypes/helpers'

const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_URL ?? 'http://localhost:3000'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? ''
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'

/**
 * Active locales. The site is English-only for now: we ignore any extra
 * `locale` documents in the dataset and always hand the plugins
 * `STATIC_LOCALES`. To re-enable a second language later, append it to
 * `STATIC_LOCALES` (or swap this for the previous Sanity-fetching variant
 * — kept in git history).
 */
async function fetchLocales() {
  return STATIC_LOCALES
}

export default defineConfig({
  name: 'default',
  title: 'Brigada',

  projectId,
  dataset,

  plugins: [
    structureTool({structure}),
    presentationTool({
      previewUrl: {
        origin: previewOrigin,
        preview: '/',
        previewMode: {enable: '/api/draft/enable'},
      },
      resolve: {
        locations: {
          homePage: defineLocations({
            select: {title: 'title'},
            resolve: () => ({locations: [{title: 'Home', href: '/'}]}),
          }),
          workIndexPage: defineLocations({
            select: {title: 'title'},
            resolve: () => ({locations: [{title: 'Work', href: '/work'}]}),
          }),
          expertiseIndexPage: defineLocations({
            select: {title: 'title'},
            resolve: () => ({locations: [{title: 'Expertise', href: '/expertise'}]}),
          }),
          aboutPage: defineLocations({
            select: {title: 'title'},
            resolve: () => ({locations: [{title: 'About', href: '/about'}]}),
          }),
          careersPage: defineLocations({
            select: {title: 'title'},
            resolve: () => ({locations: [{title: 'Careers', href: '/careers'}]}),
          }),
          contactPage: defineLocations({
            select: {title: 'title'},
            resolve: () => ({locations: [{title: 'Contact', href: '/contact'}]}),
          }),
          legalPage: defineLocations({
            select: {title: 'title', kind: 'kind'},
            resolve: (doc) =>
              doc?.kind
                ? {locations: [{title: doc.title ?? doc.kind, href: `/${doc.kind}`}]}
                : null,
          }),
          work: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc.name ?? doc.slug, href: `/work/${doc.slug}`}]}
                : null,
          }),
          expertise: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc.name ?? doc.slug, href: `/${doc.slug}`}]}
                : null,
          }),
          job: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) =>
              doc?.slug
                ? {locations: [{title: doc.name ?? doc.slug, href: `/careers/jobs/${doc.slug}`}]}
                : null,
          }),
        },
      },
    }),
    visionTool(),
    documentInternationalization({
      supportedLanguages: fetchLocales,
      schemaTypes: LOCALIZED_TYPES,
      languageField: 'locale',
      hideLanguageFilter: LOCALIZED_TYPES,
      apiVersion: API_VERSION,
    }),
    internationalizedArray({
      languages: fetchLocales,
      defaultLanguages: ['en'],
      fieldTypes: ['string', 'text', 'blockContent', 'blockContentTextOnly', 'slug'],
      apiVersion: API_VERSION,
    }),
  ],

  document: {
    newDocumentOptions: (prev, {creationContext, currentUser}) => {
      if (creationContext.type !== 'global') return prev
      const isAdmin = currentUser?.roles.some((role) => role.name === 'administrator')

      return prev.filter(({templateId}) => {
        if (!templateId) return true
        // Localized documents should be created from their language-specific desk lists.
        const type = templateId.replace(/-by-locale$/, '')
        if (LOCALIZED_TYPES.includes(type)) return false
        if (type === 'locale') return isAdmin
        return type !== 'translation.metadata'
      })
    },
    // Strip destructive doc actions on every singleton.
    actions: (prev, {schemaType}) =>
      isSingletonType(schemaType)
        ? prev.filter(({action}) =>
            action ? !['duplicate', 'unpublish', 'delete'].includes(action) : true,
          )
        : prev,
    unstable_languageFilter: (prev, ctx) => {
      if (LOCALIZED_TYPES.includes(ctx.schemaType) && ctx.documentId) {
        const documentId = ctx.documentId
        return [
          ...prev,
          (props: {schemaType: ObjectSchemaType}) => FilteredLanguageMenu({...props, documentId}),
        ]
      }
      return prev
    },
  },

  schema: {
    types: schemaTypes,
    templates: (prev) => [...prev, ...localeSingletonTemplates],
  },
})
