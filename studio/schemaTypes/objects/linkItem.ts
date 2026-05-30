import {LinkIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const linkItem = defineType({
  name: 'linkItem',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  description: 'A labelled link — internal path, external URL, email or phone.',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description: 'Visible text (e.g. "View case study", "Get in touch").',
      validation: (Rule) => Rule.required().error('Give the link a label so visitors know what it does.'),
    }),
    defineField({
      name: 'url',
      title: 'Destination',
      type: 'string',
      description:
        'Examples: https://example.com, /work/agristo, mailto:hello@brigada.be, tel:+3221234567, #section-id.',
      validation: (Rule) =>
        Rule.required()
          .custom((value) => {
            if (!value) return true
            if (/^(https?:|mailto:|tel:|\/|#)/.test(value)) return true
            return 'Must start with http(s)://, mailto:, tel:, / (internal path) or # (anchor).'
          })
          .error(),
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'url'},
    prepare({title, subtitle}) {
      return {title: title || 'Untitled link', subtitle: subtitle || 'No destination yet'}
    },
  },
})
