import {LinkIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Document types that can be linked from a menu item. Extend as new linkable
 * pages land. Keep the FE GROQ in `useSanityApi.ts` in sync — each new type
 * needs a corresponding `select()` case there to resolve its URL.
 */
const LINKABLE_TYPES = [
  'homePage',
  'aboutPage',
  'careersPage',
  'contactPage',
  'privacyPage',
  'work',
  'expertise',
  'job',
] as const

export const menuItem = defineType({
  name: 'menuItem',
  title: 'Menu item',
  type: 'object',
  icon: LinkIcon,
  description: 'A single labelled link. Either point at a page in this studio, or paste an external URL.',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'internationalizedArrayString',
      description: 'Visible text per language.',
      validation: (Rule) => Rule.required().error('Add at least one localized label.'),
    }),
    defineField({
      name: 'internal',
      title: 'Internal page',
      type: 'reference',
      to: LINKABLE_TYPES.map((type) => ({type})),
      description: 'Pick a page in this studio. Leave empty to use an external URL instead.',
    }),
    defineField({
      name: 'external',
      title: 'External URL',
      type: 'string',
      description:
        'Used only when no internal page is selected. Examples: /work, https://example.com, mailto:hello@brigada.be.',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const parent = ctx.parent as {internal?: unknown} | undefined
          if (parent?.internal) return true
          if (!value) return 'Pick an internal page or fill in an external URL.'
          if (/^(https?:|mailto:|tel:|\/|#)/.test(value)) return true
          return 'Must start with http(s)://, mailto:, tel:, / (internal path) or # (anchor).'
        }).error(),
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in new tab',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      label: 'label',
      internalTitle: 'internal.title',
      internalName: 'internal.name',
      external: 'external',
    },
    prepare({label, internalTitle, internalName, external}) {
      const first = Array.isArray(label) ? label.find((entry) => entry?.value)?.value : undefined
      return {
        title: first || 'Untitled item',
        subtitle: internalTitle || internalName || external || 'No destination yet',
      }
    },
  },
})
