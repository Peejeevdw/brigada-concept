import {ThLargeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const selectedWork = defineType({
  name: 'selectedWork',
  title: 'Selected work',
  type: 'object',
  icon: ThLargeIcon,
  description: 'A grid of curated case studies. Drag to reorder.',
  fields: [
    defineField({
      name: 'items',
      title: 'Cases',
      type: 'array',
      description:
        'Pick the cases to feature in this section. Order matters — first picks appear first.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'work'}]})],
      validation: (Rule) =>
        Rule.min(1)
          .error('Pick at least one case.')
          .max(12)
          .warning('More than twelve can make the section feel cluttered.'),
    }),
  ],
  preview: {
    select: {count: 'items.length', first: 'items.0.image'},
    prepare({count, first}) {
      return {
        title: 'Selected work',
        subtitle: count ? `${count} case${count === 1 ? '' : 's'}` : 'No cases yet',
        media: first,
      }
    },
  },
})
