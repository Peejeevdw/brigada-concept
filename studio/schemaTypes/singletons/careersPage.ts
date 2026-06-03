import {UsersIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField, pageBuilderField} from '../helpers'

/**
 * Careers page (/careers). Hero + curated/auto vacancies + culture carousel
 * + optional benefits + pageBuilder.
 */
export const careersPage = defineType({
  name: 'careersPage',
  title: 'Careers page',
  type: 'document',
  icon: UsersIcon,
  description:
    'The intro to working at Brigada. Each language has its own version; open positions come from `job` documents.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'vacancies', title: 'Vacancies'},
    {name: 'culture', title: 'Culture'},
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
      initialValue: 'Careers page',
    }),
    // ---- Hero ----
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
        defineField({name: 'title', title: 'Title / intro paragraph', type: 'text', rows: 3}),
        defineField({
          name: 'brioPaletteId',
          title: 'Brio palette',
          type: 'string',
          options: {
            list: [
              {title: 'Brio 02', value: 'brio-02'},
              {title: 'Brio 03 (default)', value: 'brio-03'},
              {title: 'Brio 04', value: 'brio-04'},
              {title: 'Brio 05', value: 'brio-05'},
              {title: 'Brio 06', value: 'brio-06'},
            ],
          },
          initialValue: 'brio-03',
        }),
        defineField({
          name: 'image',
          title: 'Hero background image',
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (Rule) =>
                Rule.custom((value, ctx) => {
                  const parent = ctx.parent as {asset?: unknown} | undefined
                  if (!parent?.asset) return true
                  return value ? true : 'Add alt text whenever an image is set.'
                }),
            }),
          ],
        }),
      ],
    }),
    // ---- Vacancies / openings ----
    defineField({
      name: 'vacancies',
      title: 'Vacancies section',
      type: 'object',
      group: 'vacancies',
      description:
        'Shown above the case-style "Open positions" block on the page.',
      fields: [
        defineField({name: 'title', title: 'Section title', type: 'string'}),
        defineField({name: 'intro', title: 'Intro', type: 'text', rows: 2}),
        defineField({
          name: 'mode',
          title: 'Source',
          type: 'string',
          options: {
            list: [
              {title: 'All open jobs (auto)', value: 'all'},
              {title: 'Curated subset', value: 'curated'},
              {title: 'Custom highlights (not jobs)', value: 'custom'},
              {title: 'Hidden', value: 'hidden'},
            ],
            layout: 'radio',
          },
          initialValue: 'all',
        }),
        defineField({
          name: 'curated',
          title: 'Curated jobs',
          type: 'array',
          of: [defineArrayMember({type: 'reference', to: [{type: 'job'}]})],
          hidden: ({parent}) => parent?.mode !== 'curated',
        }),
        defineField({
          name: 'highlights',
          title: 'Custom highlights',
          type: 'array',
          description: 'Non-job promo blocks ("We\'re always looking for…").',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'highlight',
              fields: [
                defineField({
                  name: 'title',
                  title: 'Title',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({name: 'description', title: 'Description', type: 'text', rows: 3}),
              ],
              preview: {
                select: {title: 'title', subtitle: 'description'},
              },
            }),
          ],
          hidden: ({parent}) => parent?.mode !== 'custom',
        }),
        defineField({
          name: 'emptyMessage',
          title: 'Empty-state message',
          type: 'string',
          description: 'Shown when no jobs are open.',
          initialValue: 'Nothing fits right now? Send us a line anyway.',
        }),
      ],
    }),
    // ---- Culture carousel ----
    defineField({
      name: 'carousel',
      title: 'Culture carousel',
      type: 'object',
      group: 'culture',
      fields: [
        defineField({name: 'title', title: 'Section title', type: 'string'}),
        defineField({
          name: 'images',
          title: 'Images',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'image',
              options: {hotspot: true},
              fields: [
                defineField({
                  name: 'alt',
                  title: 'Alt text',
                  type: 'string',
                  validation: (Rule) =>
                    Rule.custom((value, ctx) => {
                      const parent = ctx.parent as {asset?: unknown} | undefined
                      if (!parent?.asset) return true
                      return value ? true : 'Add alt text whenever an image is set.'
                    }),
                }),
                defineField({name: 'caption', title: 'Caption', type: 'string'}),
              ],
            }),
          ],
          validation: (Rule) => Rule.max(20),
        }),
      ],
    }),
    // ---- Benefits ----
    defineField({
      name: 'benefits',
      title: 'Benefits',
      type: 'array',
      group: 'culture',
      description: 'Quick perks shown as cards. Optional.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'benefit',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({name: 'description', title: 'Description', type: 'text', rows: 2}),
            defineField({
              name: 'icon',
              title: 'Icon (Lucide name)',
              type: 'string',
              description: 'Lucide icon name (e.g. "coffee", "rocket"). Optional.',
            }),
          ],
          preview: {select: {title: 'title', subtitle: 'description'}},
        }),
      ],
    }),
    pageBuilderField({
      group: 'content',
      description: 'Optional extra blocks.',
    }),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {title: title || 'Careers page', subtitle: locale ? `/${locale}/careers` : '/careers'}
    },
  },
})
