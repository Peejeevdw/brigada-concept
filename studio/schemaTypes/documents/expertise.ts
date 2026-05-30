import {StarIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {RESOURCE_GROUPS, languageVersionSubtitle, localeField, slugField} from '../helpers'

export const expertise = defineType({
  name: 'expertise',
  title: 'Expertise',
  type: 'document',
  icon: StarIcon,
  description:
    'An expertise. Each language has its own document version; use Document translations to switch or create versions.',
  groups: RESOURCE_GROUPS,
  fields: [
    localeField(),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'general',
      description: 'Public name shown across the site (e.g. Brand, Product, Marketing, People).',
      validation: (Rule) => Rule.required().error('Pick a short, recognisable name.'),
    }),
    slugField({
      group: 'general',
      source: 'name',
      docType: 'expertise',
      scopeField: 'locale',
      description:
        'Used in the URL (/expertise/<slug>). Click Generate to derive it from the name.',
    }),
    defineField({
      name: 'image',
      title: 'Hero image',
      type: 'image',
      group: 'content',
      description:
        'Shown at the top of the expertise page and in listings. Landscape works best — use the hotspot to set the focal point for smaller screens.',
      options: {hotspot: true},
    }),
    defineField({
      name: 'intro',
      title: 'Short intro',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'One or two sentences shown on listings and at the top of the expertise page.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      description: 'Main copy. Supports headings, lists, bold and italics.',
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
    }),
    defineField({
      name: 'lead',
      title: 'Lead contact',
      type: 'reference',
      group: 'settings',
      description: 'Person to contact for this expertise. Shown on the expertise page.',
      to: [{type: 'person'}],
    }),
    defineField({
      name: 'links',
      title: 'Related links',
      type: 'array',
      group: 'settings',
      description: 'Optional links shown alongside the body (case studies, downloads, etc.).',
      of: [defineArrayMember({type: 'linkItem'})],
    }),
    defineField({
      name: 'order',
      title: 'Display order',
      type: 'number',
      group: 'settings',
      description: 'Lower numbers appear first. Leave blank to sort alphabetically by name.',
      initialValue: 100,
    }),
    defineField({
      name: 'recruiteeId',
      title: 'Recruitee department ID',
      type: 'string',
      group: 'settings',
      description:
        'Recruitee department ID. Set this to link an offer’s department to this expertise during the jobs sync.',
    }),
  ],
  orderings: [
    {
      title: 'Display order',
      name: 'manualOrder',
      by: [{field: 'order', direction: 'asc'}],
    },
    {
      title: 'Name (A→Z)',
      name: 'nameAsc',
      by: [{field: 'name', direction: 'asc'}],
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'intro', locale: 'locale', media: 'image'},
    prepare({title, subtitle, locale, media}) {
      return {
        title: title || 'Untitled expertise',
        subtitle: languageVersionSubtitle(
          locale,
          subtitle ? subtitle.slice(0, 80) : 'No intro yet',
        ),
        media,
      }
    },
  },
})
