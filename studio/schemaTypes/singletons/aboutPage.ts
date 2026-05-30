import {InfoOutlineIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {PAGE_GROUPS, localeField, pageBuilderField} from '../helpers'

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  icon: InfoOutlineIcon,
  description: 'The story, values and people behind Brigada. Each language has its own version.',
  groups: PAGE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      description: 'Only shown in the Studio. Helps you tell drafts apart.',
      initialValue: 'About page',
    }),
    pageBuilderField({group: 'content'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {
        title: title || 'About Page',
        subtitle: locale ? `/${locale}/about` : '/about',
      }
    },
  },
})
