import {SearchIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  icon: SearchIcon,
  description:
    'Per-page SEO overrides. Falls back to the page title and site-wide settings when empty.',
  fields: [
    defineField({
      name: 'title',
      title: 'SEO title',
      type: 'string',
      description:
        'Browser tab + social card title. ~60 characters works best. Leave empty to use the page title.',
      validation: (Rule) =>
        Rule.max(70).warning('Long titles get truncated in search results.'),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 2,
      description:
        'Shown under the title in search results and on social cards. Aim for 120–160 characters.',
      validation: (Rule) =>
        Rule.max(200).warning('Long descriptions get truncated in search results.'),
    }),
    defineField({
      name: 'image',
      title: 'Share image',
      type: 'image',
      description:
        'Social-card image (Open Graph / Twitter). 1200×630 works well. Falls back to the site default.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Required when an image is set.',
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
})
