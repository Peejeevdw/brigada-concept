import {BlockquoteIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const quote = defineType({
  name: 'quote',
  title: 'Quote',
  type: 'object',
  icon: BlockquoteIcon,
  description: 'A pull quote from a client, partner or team member.',
  fields: [
    defineField({
      name: 'text',
      title: 'Quote',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required().min(10),
    }),
    defineField({name: 'author', title: 'Author', type: 'string'}),
    defineField({name: 'role', title: 'Role / company', type: 'string'}),
  ],
  preview: {
    select: {text: 'text', author: 'author', role: 'role'},
    prepare({text, author, role}) {
      const subtitle = [author, role].filter(Boolean).join(' · ')
      return {
        title: text ? `"${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"` : 'Quote',
        subtitle: subtitle || undefined,
      }
    },
  },
})
