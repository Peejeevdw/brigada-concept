import {LockIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** Document types that can be linked from `legalLinks`. Extend as new legal pages land. */
const LEGAL_PAGE_TYPES = ['privacyPage'] as const

export const legalLink = defineType({
  name: 'legalLink',
  title: 'Legal link',
  type: 'object',
  icon: LockIcon,
  description: 'A footer link. Either point at a page in the studio, or paste an external URL.',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Visible text (e.g. "Privacy Policy", "Cookies").',
      validation: (Rule) => Rule.required().error('Give the link a label.'),
    }),
    defineField({
      name: 'internal',
      title: 'Internal page',
      type: 'reference',
      to: LEGAL_PAGE_TYPES.map((type) => ({type})),
      description: 'Pick a page in this studio. Leave empty to use an external URL instead.',
    }),
    defineField({
      name: 'external',
      title: 'External URL',
      type: 'url',
      description: 'Used only when no internal page is selected.',
      validation: (Rule) =>
        Rule.uri({scheme: ['http', 'https']})
          .custom((value, ctx) => {
            const parent = ctx.parent as {internal?: unknown} | undefined
            if (parent?.internal) return true
            if (!value) return 'Pick an internal page or fill in an external URL.'
            return true
          })
          .error(),
    }),
  ],
  preview: {
    select: {label: 'label', internalTitle: 'internal.title', external: 'external'},
    prepare({label, internalTitle, external}) {
      return {
        title: label || 'Untitled link',
        subtitle: internalTitle || external || 'No destination yet',
      }
    },
  },
})
