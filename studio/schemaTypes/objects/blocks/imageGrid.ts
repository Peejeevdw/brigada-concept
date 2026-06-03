import {ImagesIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const imageGrid = defineType({
  name: 'imageGrid',
  title: 'Image grid',
  type: 'object',
  icon: ImagesIcon,
  description: '2 or 3 images side by side. Use for spread-style layouts.',
  fields: [
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'number',
      options: {list: [2, 3]},
      initialValue: 2,
      validation: (Rule) => Rule.required().integer().min(2).max(3),
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
      validation: (Rule) => Rule.min(2).error('Add at least two images.').max(12),
    }),
  ],
  preview: {
    select: {first: 'images.0', columns: 'columns', images: 'images'},
    prepare({first, columns, images}) {
      const count = Array.isArray(images) ? images.length : 0
      return {
        title: `Image grid (${columns} cols)`,
        subtitle: `${count} image${count === 1 ? '' : 's'}`,
        media: first,
      }
    },
  },
})
