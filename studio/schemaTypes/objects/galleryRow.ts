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
    defineField({
      name: 'split',
      title: 'Column split (2-item rows)',
      type: 'string',
      description:
        'Only applies to a row with exactly two items. Default keeps each visual at its own ratio (heights matched, widths follow the ratio); the weighted options crop the columns to a fixed 1/3 + 2/3 split instead.',
      options: {
        list: [
          {title: 'Natural — own ratio', value: 'even'},
          {title: '1/3  +  2/3 (left narrow, cropped)', value: 'one-two'},
          {title: '2/3  +  1/3 (right narrow, cropped)', value: 'two-one'},
        ],
        layout: 'radio',
      },
      initialValue: 'even',
      hidden: ({parent}) => (Array.isArray(parent?.items) ? parent.items.length : 0) !== 2,
    }),
    defineField({
      name: 'fullBleed',
      title: 'Full-bleed (edge to edge)',
      type: 'boolean',
      initialValue: false,
      description: 'Drop the side margins so this row runs all the way to the screen edges.',
    }),
  ],
  preview: {
    select: {items: 'items', fullBleed: 'fullBleed', split: 'split'},
    prepare({items, fullBleed, split}) {
      const n = Array.isArray(items) ? items.length : 0
      let layout = n === 1 ? 'Full width' : n === 2 ? '2 per row' : n === 3 ? '3 per row' : 'Empty'
      if (n === 2 && split === 'one-two') layout = '1/3 + 2/3'
      else if (n === 2 && split === 'two-one') layout = '2/3 + 1/3'
      return {
        title: `Row — ${n} item${n === 1 ? '' : 's'}`,
        subtitle: fullBleed ? `${layout} · edge to edge` : layout,
      }
    },
  },
})
