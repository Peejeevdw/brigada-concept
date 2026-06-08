import {StarIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField} from '../helpers'

/**
 * The /services landing page. Hero + curated list of service category
 * references shown in the grid. Each linked category has its own pillar page
 * (e.g. /brand).
 */
export const serviceCategoryIndexPage = defineType({
  name: 'serviceCategoryIndexPage',
  title: 'Services — index',
  type: 'document',
  icon: StarIcon,
  description: 'Intro and category grid on /services. Each language has its own version.',
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
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string', description: 'Small label above the big title — e.g. "OUR SERVICES".'}),
        defineField({name: 'title', title: 'Title', type: 'text', rows: 2, description: 'Big headline shown as <h1> — e.g. "The things we do (for love)".'}),
        defineField({name: 'intro', title: 'Intro paragraph', type: 'text', rows: 3, description: 'Short paragraph below the title introducing the four pillars.'}),
      ],
    }),
    defineField({
      name: 'pillars',
      title: 'Pillars',
      type: 'array',
      group: 'pillars',
      description:
        'The four categories shown on the overview, in display order. Each references a Service category document (which holds the pillar page content).',
      of: [defineArrayMember({type: 'reference', to: [{type: 'serviceCategory'}]})],
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
