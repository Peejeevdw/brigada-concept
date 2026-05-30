import {TextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const textblock = defineType({
  name: 'textblock',
  title: 'Text block',
  type: 'object',
  icon: TextIcon,
  description: 'A short intro section with stacked title lines, body copy and optional CTAs.',
  fields: [
    defineField({
      name: 'titleBlocks',
      title: 'Stacked title lines',
      description:
        'One or two short lines stacked on top of each other (e.g. "Who we are" / "Our tagline"). Maximum two.',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      validation: (Rule) => Rule.max(2).error('Use at most two title lines.'),
    }),
    defineField({
      name: 'intro',
      title: 'Body',
      type: 'array',
      description: 'Short paragraph or two. Supports bold, italics and links.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'links',
      title: 'Call-to-action links',
      type: 'array',
      description: 'Optional buttons / links shown below the body.',
      of: [defineArrayMember({type: 'linkItem'})],
    }),
  ],
  preview: {
    select: {a: 'titleBlocks.0', b: 'titleBlocks.1'},
    prepare({a, b}) {
      const title = [a, b].filter(Boolean).join(' · ') || 'Text block'
      return {title, subtitle: 'Text block'}
    },
  },
})
