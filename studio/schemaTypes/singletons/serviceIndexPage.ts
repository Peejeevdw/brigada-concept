import {StarIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField} from '../helpers'

/**
 * The /services landing page. Hero + curated list of pillar references shown
 * in the grid. Each linked service has its own pillar page (e.g. /brand).
 */
export const serviceIndexPage = defineType({
  name: 'serviceIndexPage',
  title: 'Services — index',
  type: 'document',
  icon: StarIcon,
  description: 'Intro and pillar grid on /services. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'pillars', title: 'Pillars'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      initialValue: 'Services index',
    }),
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
        defineField({name: 'title', title: 'Title / intro paragraph', type: 'text', rows: 3}),
      ],
    }),
    defineField({
      name: 'pillars',
      title: 'Pillars',
      type: 'array',
      group: 'pillars',
      description:
        'The four pillars shown on the overview, in display order. Each references a Service document (which holds the pillar page content).',
      of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})],
      validation: (Rule) =>
        Rule.min(1).error('Add at least one pillar.').max(8).warning('More than eight starts to feel cluttered.'),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {title: title || 'Services — index', subtitle: locale ? `/${locale}/services` : '/services'}
    },
  },
})
