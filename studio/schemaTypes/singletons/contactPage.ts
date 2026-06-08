import {EnvelopeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField} from '../helpers'

/**
 * Contact page (/contact). Hero + form + service contacts + locations +
 * optional gallery. Practice leads / general contact come from siteSettings
 * + per-service refs, so we don't duplicate them here.
 */
export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact page',
  type: 'document',
  icon: EnvelopeIcon,
  description: 'Get-in-touch page. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'form', title: 'Form'},
    {name: 'contacts', title: 'Contacts'},
    {name: 'locations', title: 'Locations'},
    {name: 'gallery', title: 'Gallery'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      initialValue: 'Contact page',
    }),
    // ---- Hero ----
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
        defineField({name: 'title', title: 'Title / intro paragraph', type: 'text', rows: 3}),
        defineField({
          name: 'brioPaletteId',
          title: 'Brio palette',
          type: 'string',
          options: {
            list: [
              {title: 'Brio 02', value: 'brio-02'},
              {title: 'Brio 03', value: 'brio-03'},
              {title: 'Brio 04', value: 'brio-04'},
              {title: 'Brio 05 (default)', value: 'brio-05'},
              {title: 'Brio 06', value: 'brio-06'},
            ],
          },
          initialValue: 'brio-05',
        }),
        defineField({
          name: 'image',
          title: 'Background image',
          type: 'image',
          options: {hotspot: true},
        }),
      ],
    }),
    // ---- Form ----
    defineField({
      name: 'form',
      title: 'Form',
      type: 'object',
      group: 'form',
      fields: [
        defineField({name: 'intro', title: 'Intro', type: 'string', initialValue: 'Hi there'}),
        defineField({
          name: 'submitLabel',
          title: 'Submit label',
          type: 'string',
          initialValue: 'Send',
        }),
        defineField({
          name: 'successMessage',
          title: 'Success message',
          type: 'text',
          rows: 2,
        }),
        defineField({
          name: 'fields',
          title: 'Form fields',
          type: 'array',
          description: 'Fields shown on the form, in display order.',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'formField',
              fields: [
                defineField({
                  name: 'name',
                  title: 'Name (machine-readable)',
                  type: 'string',
                  description: 'Used in the submission payload (e.g. "email", "company").',
                  validation: (Rule) =>
                    Rule.required()
                      .regex(/^[a-z][a-z0-9_-]*$/, {name: 'field name'})
                      .error('Lowercase letters, digits, underscores or dashes only.'),
                }),
                defineField({
                  name: 'label',
                  title: 'Label',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'type',
                  title: 'Type',
                  type: 'string',
                  options: {
                    list: [
                      {title: 'Text', value: 'text'},
                      {title: 'Email', value: 'email'},
                      {title: 'Phone', value: 'tel'},
                      {title: 'Textarea (multi-line)', value: 'textarea'},
                      {title: 'Select', value: 'select'},
                    ],
                    layout: 'radio',
                  },
                  initialValue: 'text',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'required',
                  title: 'Required',
                  type: 'boolean',
                  initialValue: false,
                }),
                defineField({
                  name: 'placeholder',
                  title: 'Placeholder',
                  type: 'string',
                }),
                defineField({
                  name: 'options',
                  title: 'Select options',
                  type: 'array',
                  of: [defineArrayMember({type: 'string'})],
                  hidden: ({parent}) => parent?.type !== 'select',
                }),
                defineField({
                  name: 'span',
                  title: 'Column span',
                  type: 'string',
                  options: {
                    list: [
                      {title: 'Half-width', value: 'half'},
                      {title: 'Full-width', value: 'full'},
                    ],
                    layout: 'radio',
                  },
                  initialValue: 'half',
                }),
              ],
              preview: {
                select: {label: 'label', type: 'type', required: 'required'},
                prepare({label, type, required}) {
                  return {
                    title: label || 'Field',
                    subtitle: `${type}${required ? ' · required' : ''}`,
                  }
                },
              },
            }),
          ],
        }),
      ],
    }),
    // ---- Service contacts ----
    defineField({
      name: 'serviceContacts',
      title: 'Service contacts',
      type: 'array',
      group: 'contacts',
      description: 'Per-pillar leads shown below the form. Override or add entries here.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'serviceContact',
          fields: [
            defineField({
              name: 'label',
              title: 'Section label',
              type: 'string',
              description: 'E.g. "Brand", "New bizz".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'service',
              title: 'Service (optional)',
              type: 'reference',
              to: [{type: 'service'}],
              description: 'If set, the person can be auto-resolved from `service.lead`.',
            }),
            defineField({
              name: 'person',
              title: 'Person',
              type: 'reference',
              to: [{type: 'person'}],
              description: 'Direct override. If empty and a service is set, we fall back to its lead.',
            }),
          ],
          preview: {
            select: {label: 'label', personName: 'person.name', serviceName: 'service.name'},
            prepare({label, personName, serviceName}) {
              return {
                title: label || serviceName || 'Contact',
                subtitle: personName || (serviceName ? `lead of ${serviceName}` : ''),
              }
            },
          },
        }),
      ],
    }),
    // ---- Locations ----
    defineField({
      name: 'locations',
      title: 'Locations',
      type: 'object',
      group: 'locations',
      fields: [
        defineField({
          name: 'mode',
          title: 'Source',
          type: 'string',
          options: {
            list: [
              {title: 'All offices (auto)', value: 'all'},
              {title: 'Curated subset', value: 'curated'},
              {title: 'Hidden', value: 'hidden'},
            ],
            layout: 'radio',
          },
          initialValue: 'all',
        }),
        defineField({
          name: 'curated',
          title: 'Curated offices',
          type: 'array',
          of: [defineArrayMember({type: 'reference', to: [{type: 'location'}]})],
          hidden: ({parent}) => parent?.mode !== 'curated',
        }),
      ],
    }),
    // ---- Gallery ----
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'gallery',
      description: 'Optional masonry image strip somewhere on the page.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (Rule) =>
                Rule.custom((value, ctx) => {
                  const parent = ctx.parent as {asset?: unknown} | undefined
                  if (!parent?.asset) return true
                  return value ? true : 'Add alt text whenever an image is set.'
                }),
            }),
          ],
        }),
      ],
      validation: (Rule) => Rule.max(20),
    }),
    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {title: title || 'Contact page', subtitle: locale ? `/${locale}/contact` : '/contact'}
    },
  },
})
