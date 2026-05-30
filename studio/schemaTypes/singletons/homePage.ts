import {HomeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {PAGE_GROUPS, localeField, pageBuilderField} from '../helpers'

export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  icon: HomeIcon,
  description: 'The landing page at the root of the site. Each language has its own version.',
  groups: PAGE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      description: 'Only shown in the Studio. Helps you tell drafts apart.',
      initialValue: 'Home Page',
    }),
    pageBuilderField({group: 'content'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {
        title: title || 'Home Page',
        subtitle: locale ? `/${locale}` : '/',
      }
    },
  },
})
