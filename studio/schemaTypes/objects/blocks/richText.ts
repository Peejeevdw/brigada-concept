import {TextIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const richText = defineType({
  name: 'richText',
  title: 'Rich text',
  type: 'object',
  icon: TextIcon,
  description: 'Paragraphs, headings, lists, links — the editorial workhorse.',
  fields: [
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      validation: (Rule) => Rule.required().min(1).error('Add at least one block.'),
    }),
    defineField({
      name: 'width',
      title: 'Column width',
      type: 'string',
      description: 'Constrains readability on wide screens.',
      options: {
        list: [
          {title: 'Narrow (single column)', value: 'narrow'},
          {title: 'Medium (default)', value: 'medium'},
          {title: 'Wide', value: 'wide'},
        ],
        layout: 'radio',
      },
      initialValue: 'medium',
    }),
  ],
  preview: {
    select: {body: 'body'},
    prepare({body}) {
      const block = Array.isArray(body) ? body[0] : null
      const first =
        block && Array.isArray((block as {children?: {text?: string}[]}).children)
          ? ((block as {children?: {text?: string}[]}).children?.[0]?.text ?? '')
          : ''
      return {title: 'Rich text', subtitle: first.slice(0, 80) || 'Empty'}
    },
  },
})
