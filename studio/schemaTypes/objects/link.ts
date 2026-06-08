import {LinkIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Unified link object. Replaces the old `linkItem`, `menuItem`, and `legalLink`
 * objects: one shape with a `target` discriminator. Use the `submenu` field to
 * nest items (e.g. the Services dropdown in the main nav).
 *
 * Document types that can be linked. Extend as new linkable pages land.
 */
const LINKABLE_TYPES = [
  'homePage',
  'workIndexPage',
  'serviceIndexPage',
  'aboutPage',
  'careersPage',
  'contactPage',
  'legalPage',
  'work',
  'service',
  'job',
] as const

export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  description:
    'A labelled link. Point at an internal page, paste an external URL, or use mailto/tel.',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'internationalizedArrayString',
      description: 'Visible text per language.',
      validation: (Rule) => Rule.required().error('Add at least one localized label.'),
    }),
    defineField({
      name: 'target',
      title: 'Target type',
      type: 'string',
      options: {
        list: [
          {title: 'Internal page', value: 'internal'},
          {title: 'External URL', value: 'external'},
          {title: 'Email', value: 'email'},
          {title: 'Phone', value: 'phone'},
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
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const parent = ctx.parent as {target?: string} | undefined
          if (parent?.target !== 'internal') return true
          return value ? true : 'Pick an internal page.'
        }),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'string',
      description: 'Full URL including https://',
      hidden: ({parent}) => parent?.target !== 'external',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const parent = ctx.parent as {target?: string} | undefined
          if (parent?.target !== 'external') return true
          if (!value) return 'Add a URL.'
          return /^https?:\/\//.test(value) ? true : 'Must start with http:// or https://'
        }),
    }),
    defineField({
      name: 'email',
      title: 'Email address',
      type: 'string',
      hidden: ({parent}) => parent?.target !== 'email',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const parent = ctx.parent as {target?: string} | undefined
          if (parent?.target !== 'email') return true
          if (!value) return 'Add an email address.'
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Not a valid email.'
        }),
    }),
    defineField({
      name: 'phone',
      title: 'Phone number',
      type: 'string',
      description: 'International format, e.g. +32 2 123 45 67.',
      hidden: ({parent}) => parent?.target !== 'phone',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const parent = ctx.parent as {target?: string} | undefined
          if (parent?.target !== 'phone') return true
          return value ? true : 'Add a phone number.'
        }),
    }),
    defineField({
      name: 'anchor',
      title: 'Anchor',
      type: 'string',
      description: 'Section id without the # (e.g. "team").',
      hidden: ({parent}) => parent?.target !== 'anchor',
      validation: (Rule) =>
        Rule.custom((value, ctx) => {
          const parent = ctx.parent as {target?: string} | undefined
          if (parent?.target !== 'anchor') return true
          return value ? true : 'Add an anchor name.'
        }),
    }),
    defineField({
      name: 'openInNewTab',
      title: 'Open in new tab',
      type: 'boolean',
      initialValue: false,
      hidden: ({parent}) => parent?.target === 'email' || parent?.target === 'phone' || parent?.target === 'anchor',
    }),
    defineField({
      name: 'submenu',
      title: 'Submenu items',
      type: 'array',
      description: 'Optional nested items (e.g. Services → Brand / Marketing / People / Product).',
      of: [{type: 'submenuItem'}],
    }),
  ],
  preview: {
    select: {
      label: 'label',
      target: 'target',
      internalTitle: 'internal.title',
      internalName: 'internal.name',
      url: 'url',
      email: 'email',
      phone: 'phone',
      anchor: 'anchor',
    },
    prepare({label, target, internalTitle, internalName, url, email, phone, anchor}) {
      const first = Array.isArray(label) ? label.find((entry) => entry?.value)?.value : undefined
      const subtitle =
        target === 'internal'
          ? internalTitle || internalName || '(pick a page)'
          : target === 'external'
            ? url || '(set a URL)'
            : target === 'email'
              ? email ? `mailto:${email}` : '(set email)'
              : target === 'phone'
                ? phone ? `tel:${phone}` : '(set phone)'
                : target === 'anchor'
                  ? anchor ? `#${anchor}` : '(set anchor)'
                  : ''
      return {
        title: first || 'Untitled link',
        subtitle,
      }
    },
  },
})
