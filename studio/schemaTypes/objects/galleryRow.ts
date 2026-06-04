import {ThLargeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

// One horizontal row of visuals in the case gallery. The number of items the
// editor adds (1, 2 or 3) decides the layout: 1 = full width, 2 = two-up,
// 3 = three-up. Each item is an image or a video (caseMedia).
export const galleryRow = defineType({
  name: 'galleryRow',
  title: 'Row',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({
      name: 'items',
      title: 'Items (1–3 per row)',
      type: 'array',
      description:
        'Add 1, 2 or 3 visuals. The count sets the layout: 1 = full width, 2 = two per row, 3 = three per row.',
      of: [defineArrayMember({type: 'caseMedia'})],
      validation: (Rule) =>
        Rule.min(1)
          .error('Add at least one visual.')
          .max(3)
          .error('A row holds at most three items.'),
    }),
  ],
  preview: {
    select: {items: 'items'},
    prepare({items}) {
      const n = Array.isArray(items) ? items.length : 0
      const layout = n === 1 ? 'Full width' : n === 2 ? '2 per row' : n === 3 ? '3 per row' : 'Empty'
      return {title: `Row — ${n} item${n === 1 ? '' : 's'}`, subtitle: layout}
    },
  },
})
