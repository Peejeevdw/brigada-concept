import {InfoOutlineIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField, pageBuilderField} from '../helpers'

/**
 * About page (/about). Structured: gooey hero word-morph + narrative +
 * labelled sections + carousel. Optional pageBuilder for one-off blocks.
 */
export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  icon: InfoOutlineIcon,
  description: 'The story, values and people behind Brigada. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'narrative', title: 'Narrative'},
    {name: 'sections', title: 'Sections'},
    {name: 'carousel', title: 'Carousel'},
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
      initialValue: 'About page',
    }),
    // ---- Gooey hero ----
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      description:
        'The gooey word-morph hero. Each entry becomes one of the morphed words (e.g. "SHARP", "BEATS", "LOUD").',
      fields: [
        defineField({
          name: 'words',
          title: 'Morph words',
          type: 'array',
          of: [defineArrayMember({type: 'string'})],
          validation: (Rule) =>
            Rule.min(2).error('The morph needs at least two words.').max(6).warning('Six is plenty.'),
        }),
      ],
    }),
    // ---- Scroll narrative ----
    defineField({
      name: 'narrative',
      title: 'Narrative',
      type: 'blockContent',
      group: 'narrative',
      description:
        'Long-form intro that fills in with colour on scroll. Plain paragraphs work best.',
    }),
    // ---- Labelled sections ----
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'sections',
      description: 'Numbered, labelled blocks (e.g. "THE FIGHT WE PICKED", "STRONG HERITAGE").',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'aboutSection',
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'All-caps section heading (e.g. "THE FIGHT WE PICKED").',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Body',
              type: 'blockContent',
            }),
            defineField({
              name: 'layout',
              title: 'Layout',
              type: 'string',
              options: {
                list: [
                  {title: 'Text only (default)', value: 'text'},
                  {title: 'Image left, text right', value: 'image-left'},
                  {title: 'Image right, text left', value: 'image-right'},
                  {title: 'Full-bleed image above text', value: 'full-bleed'},
                ],
                layout: 'radio',
              },
              initialValue: 'text',
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: {hotspot: true},
              hidden: ({parent}) => parent?.layout === 'text',
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
          preview: {
            select: {label: 'label', layout: 'layout', media: 'image'},
            prepare({label, layout, media}) {
              return {title: label || 'Section', subtitle: layout || 'text', media}
            },
          },
        }),
      ],
    }),
    // ---- Carousel ----
    defineField({
      name: 'carousel',
      title: 'Carousel',
      type: 'object',
      group: 'carousel',
      fields: [
        defineField({
          name: 'title',
          title: 'Section title',
          type: 'string',
        }),
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
    pageBuilderField({
      group: 'content',
      description: 'Optional extra blocks below the standard sections.',
    }),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {title: title || 'About page', subtitle: locale ? `/${locale}/about` : '/about'}
    },
  },
})
