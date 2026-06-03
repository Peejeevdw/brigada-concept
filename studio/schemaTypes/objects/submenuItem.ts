import {LinkIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * A nested menu entry. Same shape as `link` but without its own submenu — we
 * limit menu depth to one level to keep the FE rendering predictable.
 */
const LINKABLE_TYPES = [
  'homePage',
  'workIndexPage',
  'expertiseIndexPage',
  'aboutPage',
  'careersPage',
  'contactPage',
  'legalPage',
  'work',
  'expertise',
  'job',
] as const

export const submenuItem = defineType({
  name: 'submenuItem',
  title: 'Submenu item',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'internationalizedArrayString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'target',
      title: 'Target type',
      type: 'string',
      options: {
        list: [
          {title: 'Internal page', value: 'internal'},
          {title: 'External URL', value: 'external'},
          {title: 'Anchor (#section)', value: 'anchor'},
        ],
        layout: 'radio',
      },
      initialValue: 'internal',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'internal',
      title: 'Internal page',
      type: 'reference',
      to: LINKABLE_TYPES.map((type) => ({type})),
      hidden: ({parent}) => parent?.target !== 'internal',
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'string',
      hidden: ({parent}) => parent?.target !== 'external',
    }),
    defineField({
      name: 'anchor',
      title: 'Anchor',
      type: 'string',
      hidden: ({parent}) => parent?.target !== 'anchor',
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in new tab',
      type: 'boolean',
      initialValue: false,
      hidden: ({parent}) => parent?.target === 'anchor',
    }),
  ],
  preview: {
    select: {label: 'label', target: 'target', internalTitle: 'internal.title', internalName: 'internal.name', url: 'url'},
    prepare({label, internalTitle, internalName, url}) {
      const first = Array.isArray(label) ? label.find((entry) => entry?.value)?.value : undefined
      return {
        title: first || 'Untitled item',
        subtitle: internalTitle || internalName || url || '(no destination)',
      }
    },
  },
})
