import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {languageVersionSubtitle, localeField} from '../helpers'

export const person = defineType({
  name: 'person',
  title: 'Person',
  type: 'document',
  icon: UserIcon,
  description:
    'A contact person for an expertise or page. Each language has its own document version when the role or intro needs translating.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'contact', title: 'Contact'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'image',
      title: 'Portrait',
      type: 'image',
      group: 'general',
      description: 'A friendly headshot. Square (1:1) or portrait (4:5) works best.',
      options: {hotspot: true},
    }),
    defineField({
      name: 'name',
      title: 'Full name',
      type: 'string',
      group: 'general',
      description: 'First and last name (e.g. Jane Janssens).',
      validation: (Rule) => Rule.required().error('Add the person’s name.'),
    }),
    defineField({
      name: 'position',
      title: 'Role',
      type: 'string',
      group: 'general',
      description: 'Job title shown next to the name (e.g. "Brand Lead", "Creative Director").',
    }),
    defineField({
      name: 'intro',
      title: 'Short intro',
      type: 'text',
      group: 'general',
      rows: 3,
      description: 'One or two sentences about this person, shown alongside their photo.',
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'contact',
      description: 'International format with country code, e.g. +32 2 123 45 67.',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'contact',
      description: 'Reachable inbox. We validate the format.',
      validation: (Rule) => Rule.email().error('That doesn’t look like a valid email address.'),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'position', locale: 'locale', media: 'image'},
    prepare({title, subtitle, locale, media}) {
      return {
        title: title || 'Unnamed person',
        subtitle: languageVersionSubtitle(locale, subtitle || 'No role yet'),
        media,
      }
    },
  },
})
