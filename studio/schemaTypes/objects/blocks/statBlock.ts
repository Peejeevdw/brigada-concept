import {NumberIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const statBlock = defineType({
  name: 'statBlock',
  title: 'Stats',
  type: 'object',
  icon: NumberIcon,
  description: 'One or more numbers (impact, audience reach, awards) with a short label each.',
  fields: [
    defineField({
      name: 'items',
      title: 'Stats',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stat',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'E.g. "1.4M", "+42%", "3×".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'text',
              rows: 2,
            }),
          ],
          preview: {
            select: {value: 'value', label: 'label'},
            prepare({value, label}) {
              return {title: value || 'Stat', subtitle: label || ''}
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.min(1).error('Add at least one stat.').max(6).warning('More than six gets cluttered.'),
    }),
  ],
  preview: {
    select: {items: 'items'},
    prepare({items}) {
      const count = Array.isArray(items) ? items.length : 0
      const first = Array.isArray(items) ? (items[0] as {value?: string} | undefined)?.value : undefined
      return {
        title: 'Stats',
        subtitle: `${count} stat${count === 1 ? '' : 's'}${first ? ` · ${first}` : ''}`,
      }
    },
  },
})
