import {StarIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField, pageBuilderField} from '../helpers'

/**
 * The /expertise landing page. Hero + curated list of pillar references shown
 * in the grid. Each linked expertise has its own pillar page (e.g. /brand).
 */
export const expertiseIndexPage = defineType({
  name: 'expertiseIndexPage',
  title: 'Expertise — index',
  type: 'document',
  icon: StarIcon,
  description: 'Intro and pillar grid on /expertise. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'pillars', title: 'Pillars'},
    {name: 'content', title: 'Extra content'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      initialValue: 'Expertise index',
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
        'The four pillars shown on the overview, in display order. Each references an Expertise document (which holds the pillar page content).',
      of: [defineArrayMember({type: 'reference', to: [{type: 'expertise'}]})],
      validation: (Rule) =>
        Rule.min(1).error('Add at least one pillar.').max(8).warning('More than eight starts to feel cluttered.'),
    }),
    pageBuilderField({
      group: 'content',
      description: 'Optional extra blocks below the pillar grid.',
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
      return {title: title || 'Expertise — index', subtitle: locale ? `/${locale}/expertise` : '/expertise'}
    },
  },
})
