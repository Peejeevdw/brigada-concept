import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const sectionImage = defineType({
  name: 'sectionImage',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
  description: 'A single image. Pick "inline" for a column-width image; "full-bleed" runs edge to edge.',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      validation: (Rule) => Rule.required(),
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
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
    defineField({
      name: 'variant',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Inline (column width)', value: 'inline'},
          {title: 'Full-bleed (edge to edge)', value: 'full-bleed'},
        ],
        layout: 'radio',
      },
      initialValue: 'inline',
    }),
  ],
  preview: {
    select: {media: 'image', caption: 'caption', variant: 'variant'},
    prepare({media, caption, variant}) {
      return {
        title: caption || 'Image',
        subtitle: variant,
        media,
      }
    },
  },
})
