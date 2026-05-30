import {PinIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {LOCATION_GROUPS, i18nTitlePreview} from '../helpers'

export const location = defineType({
  name: 'location',
  title: 'Location',
  type: 'document',
  icon: PinIcon,
  description:
    'A Brigada office. Translations live inside the individual fields; offices do not have separate documents per language.',
  groups: LOCATION_GROUPS,
  fields: [
    defineField({
      name: 'title',
      title: 'Office name',
      type: 'internationalizedArrayString',
      group: 'general',
      description: 'Short label shown in lists (e.g. "Brussels", "Antwerp HQ"), per language.',
      validation: (Rule) => Rule.required().error('Give the office a label.'),
    }),
    defineField({
      name: 'street',
      title: 'Street',
      type: 'internationalizedArrayString',
      group: 'address',
      description: 'Street name only — no house number. Translated per language.',
    }),
    defineField({
      name: 'number',
      title: 'House number',
      type: 'string',
      group: 'address',
      description: 'Supports values like "12A" or "B3". Not translated.',
    }),
    defineField({
      name: 'postalCode',
      title: 'Postal code',
      type: 'string',
      group: 'address',
      description: 'E.g. 1000 (Brussels), 2000 (Antwerp). Not translated.',
    }),
    defineField({
      name: 'city',
      title: 'City',
      type: 'internationalizedArrayString',
      group: 'address',
      description: 'Translated per language.',
    }),
    defineField({
      name: 'country',
      title: 'Country',
      type: 'internationalizedArrayString',
      group: 'address',
      description: 'Full country name (e.g. Belgium / België). Translated per language.',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'contact',
      description: 'Office inbox (e.g. brussels@brigada.be). Not translated.',
      validation: (Rule) => Rule.email().error('That doesn’t look like a valid email address.'),
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'contact',
      description: 'International format with country code, e.g. +32 2 123 45 67. Not translated.',
    }),
  ],
  preview: i18nTitlePreview({
    extraSelect: {postalCode: 'postalCode'},
    subtitleField: 'postalCode',
  }),
})
