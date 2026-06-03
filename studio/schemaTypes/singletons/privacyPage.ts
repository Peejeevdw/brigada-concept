import {LockIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {PAGE_GROUPS, localeField} from '../helpers'

export const privacyPage = defineType({
  name: 'privacyPage',
  title: 'Privacy Page',
  type: 'document',
  icon: LockIcon,
  description: 'Privacy policy. Each language has its own version.',
  groups: PAGE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      description: 'Only shown in the Studio. Helps you tell drafts apart.',
      initialValue: 'Privacy Page',
    }),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {
        title: title || 'Privacy Page',
        subtitle: locale ? `/${locale}/privacy` : '/privacy',
      }
    },
  },
})
