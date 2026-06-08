import {CaseIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {RESOURCE_GROUPS, languageVersionSubtitle, localeField, slugField} from '../helpers'

const blockContentField = (name: string, title: string, description: string) =>
  defineField({
    name,
    title,
    type: 'array',
    group: 'content',
    description,
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          {title: 'Normal', value: 'normal'},
          {title: 'Heading 2', value: 'h2'},
          {title: 'Heading 3', value: 'h3'},
          {title: 'Quote', value: 'blockquote'},
        ],
        lists: [
          {title: 'Bullet', value: 'bullet'},
          {title: 'Numbered', value: 'number'},
        ],
        marks: {
          decorators: [
            {title: 'Bold', value: 'strong'},
            {title: 'Italic', value: 'em'},
          ],
        },
      }),
    ],
  })

export const job = defineType({
  name: 'job',
  title: 'Job',
  type: 'document',
  icon: CaseIcon,
  description:
    'A vacancy. Jobs usually come from Recruitee and each language has its own document version.',
  groups: RESOURCE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'name',
      title: 'Job title',
      type: 'string',
      group: 'general',
      description: 'Public title shown in listings and at the top of the detail page.',
      validation: (Rule) => Rule.required().error('A title is needed for listings and the URL.'),
    }),
    slugField({
      group: 'general',
      source: 'name',
      docType: 'job',
      scopeField: 'locale',
      description:
        'Used in the URL (/careers/jobs/<slug>). Click Generate to derive it from the title.',
    }),
    defineField({
      name: 'image',
      title: 'Hero image',
      type: 'image',
      group: 'general',
      description: 'Shown at the top of the job page and in listings. Landscape works best.',
      options: {hotspot: true},
    }),
    defineField({
      name: 'type',
      title: 'Employment type',
      type: 'string',
      group: 'general',
      description: 'How this role is offered.',
      options: {
        list: [
          {title: 'Full-time', value: 'full-time'},
          {title: 'Part-time', value: 'part-time'},
          {title: 'Internship', value: 'internship'},
          {title: 'Freelance', value: 'freelance'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'reference',
      group: 'general',
      description: 'Office where this role is based.',
      to: [{type: 'location'}],
    }),
    defineField({
      name: 'serviceCategory',
      title: 'Service category / team',
      type: 'reference',
      group: 'general',
      description: 'Which service category this role sits under (Brand, Product, Marketing, etc.).',
      to: [{type: 'serviceCategory'}],
    }),
    defineField({
      name: 'publishDate',
      title: 'Publish date',
      type: 'datetime',
      group: 'general',
      description: 'When this vacancy went live. Used for sorting.',
    }),
    defineField({
      name: 'recruiteeId',
      title: 'Recruitee ID',
      type: 'string',
      group: 'general',
      hidden: true,
      readOnly: true,
      description: 'Set automatically by the Recruitee sync. Do not edit by hand.',
    }),
    defineField({
      name: 'introIndex',
      title: 'Listing intro',
      type: 'text',
      group: 'content',
      rows: 2,
      description: 'Short intro shown on the jobs listing card.',
    }),
    defineField({
      name: 'introDetail',
      title: 'Detail intro',
      type: 'text',
      group: 'content',
      rows: 4,
      description: 'Longer intro shown at the top of the job detail page.',
    }),
    blockContentField(
      'jobDescription',
      'Job description',
      'Main copy describing the role. Supports headings, lists, bold and italics.',
    ),
    blockContentField(
      'profile',
      'Profile',
      'Who we are looking for — skills, experience, mindset.',
    ),
    blockContentField('offer', 'What we offer', 'Perks, benefits, and what the role brings.'),
    defineField({
      name: 'spotify',
      title: 'Spotify embed URL',
      type: 'url',
      group: 'content',
      description: 'Optional Spotify playlist or podcast embed shown on the detail page.',
      validation: (Rule) =>
        Rule.uri({scheme: ['http', 'https']}).error('Use a full https:// Spotify URL.'),
    }),
    defineField({
      name: 'contact',
      title: 'Contact person',
      type: 'reference',
      group: 'settings',
      description: 'Recruiter or hiring lead shown on the detail page.',
      to: [{type: 'person'}],
    }),
    defineField({
      name: 'form',
      title: 'Application form',
      type: 'object',
      group: 'content',
      description:
        'Fields shown in the apply form at the bottom of the job page. ' +
        'Same shape as the contact form so the structure is familiar.',
      fields: [
        defineField({name: 'intro', title: 'Intro', type: 'string'}),
        defineField({
          name: 'submitLabel',
          title: 'Submit label',
          type: 'string',
          initialValue: 'Send application',
        }),
        defineField({name: 'successMessage', title: 'Success message', type: 'text', rows: 2}),
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
                      {title: 'File upload', value: 'file'},
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
                defineField({name: 'placeholder', title: 'Placeholder', type: 'string'}),
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
                  initialValue: 'full',
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
    defineField({
      name: 'showOnHome',
      title: 'Feature on home page',
      type: 'boolean',
      group: 'settings',
      description: 'Surface this vacancy on the home page.',
      initialValue: false,
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'settings',
      description: 'Lower numbers appear first. Leave blank to sort by publish date.',
      initialValue: 100,
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'manualOrder',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Publish date (newest first)',
      name: 'publishDateDesc',
      by: [{field: 'publishDate', direction: 'desc'}],
    },
    {
      title: 'Title (A→Z)',
      name: 'nameAsc',
      by: [{field: 'name', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'name', type: 'type', locale: 'locale', media: 'image'},
    prepare({title, type, locale, media}) {
      return {
        title: title || 'Untitled job',
        subtitle: languageVersionSubtitle(
          locale,
          type ? type.charAt(0).toUpperCase() + type.slice(1) : 'No type yet',
        ),
        media,
      }
    },
  },
})
