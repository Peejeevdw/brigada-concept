import {UsersIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {PAGE_GROUPS, localeField, pageBuilderField} from '../helpers'

export const careersPage = defineType({
  name: 'careersPage',
  title: 'Careers Page',
  type: 'document',
  icon: UsersIcon,
  description:
    'The intro to working at Brigada. Each language has its own version; open positions come from Recruitee.',
  groups: PAGE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      description: 'Only shown in the Studio. Helps you tell drafts apart.',
      initialValue: 'Careers Page',
    }),
    pageBuilderField({group: 'content'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {
        title: title || 'Careers Page',
        subtitle: locale ? `/${locale}/careers` : '/careers',
      }
    },
  },
})
