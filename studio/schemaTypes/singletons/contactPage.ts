import {EnvelopeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {PAGE_GROUPS, localeField, pageBuilderField} from '../helpers'

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  icon: EnvelopeIcon,
  description: 'Get-in-touch page. Each language has its own version.',
  groups: PAGE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      description: 'Only shown in the Studio. Helps you tell drafts apart.',
      initialValue: 'Contact Page',
    }),
    pageBuilderField({group: 'content'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {
        title: title || 'Contact Page',
        subtitle: locale ? `/${locale}/contact` : '/contact',
      }
    },
  },
})
