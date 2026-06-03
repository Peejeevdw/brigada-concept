import {LockIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {documentLocalePreview, localeField} from '../helpers'

/**
 * Legal page (privacy, cookies, terms, imprint, …). One document per `kind` ×
 * locale. The FE picks the document by `kind` for routes like /privacy and
 * /cookies.
 */
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  icon: LockIcon,
  description: 'A standalone legal document. Each language has its own version per kind.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'content', title: 'Content'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      group: 'general',
      description: 'Which legal section this document is for. Each kind has a fixed FE route.',
      options: {
        list: [
          {title: 'Privacy policy (/privacy)', value: 'privacy'},
          {title: 'Cookies (/cookies)', value: 'cookies'},
          {title: 'Terms (/terms)', value: 'terms'},
          {title: 'Imprint (/imprint)', value: 'imprint'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required().error('Pick the kind of legal page.'),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'general',
      description: 'Shown as the page heading.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      group: 'content',
      description: 'The full legal copy.',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {kind: 'kind', title: 'title', locale: 'locale'},
    prepare({kind, title, locale}) {
      return {
        title: title || `${kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : 'Legal'} page`,
        subtitle: [kind ? `/${kind}` : '—', locale?.toUpperCase()].filter(Boolean).join(' · '),
      }
    },
  },
})
