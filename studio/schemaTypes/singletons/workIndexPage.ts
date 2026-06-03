import {CaseIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {localeField, pageBuilderField} from '../helpers'

/**
 * The /work landing page. Just the hero block — the case grid below is built
 * by querying all `work` documents.
 */
export const workIndexPage = defineType({
  name: 'workIndexPage',
  title: 'Work — index',
  type: 'document',
  icon: CaseIcon,
  description: 'Intro content shown above the case grid on /work. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
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
      initialValue: 'Work index',
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
    pageBuilderField({
      group: 'content',
      description:
        'Optional extra blocks shown below the grid. Leave empty if the page only needs the hero + grid.',
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
      return {title: title || 'Work — index', subtitle: locale ? `/${locale}/work` : '/work'}
    },
  },
})
