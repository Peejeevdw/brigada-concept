import {MenuIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const menu = defineType({
  name: 'menu',
  title: 'Menu',
  type: 'document',
  icon: MenuIcon,
  description: 'A reusable menu (e.g. footer, main nav). Queried by identifier.',
  fields: [
    defineField({
      name: 'title',
      title: 'Internal name',
      description: 'Shown only in Studio (e.g. "Footer", "Main navigation").',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'identifier',
      title: 'Identifier',
      description:
        'Stable key used by the frontend to look this menu up. Lowercase, no spaces (e.g. "footer", "main").',
      type: 'string',
      validation: (Rule) =>
        Rule.required()
          .custom((value) => {
            if (!value) return true
            return /^[a-z0-9-]+$/.test(value) ? true : 'Only lowercase letters, digits and dashes.'
          })
          .error(),
    }),
    defineField({
      name: 'items',
      title: 'Items',
      description: 'Pick an internal page or paste an external URL per item. Drag to reorder.',
      type: 'array',
      of: [{type: 'menuItem'}],
      validation: (Rule) => Rule.min(1).error('Add at least one item.'),
    }),
  ],
  preview: {
    select: {title: 'title', identifier: 'identifier', items: 'items'},
    prepare({title, identifier, items}) {
      const count = Array.isArray(items) ? items.length : 0
      return {
        title: title || 'Untitled menu',
        subtitle: `${identifier ?? '—'} · ${count} item${count === 1 ? '' : 's'}`,
      }
    },
  },
})
