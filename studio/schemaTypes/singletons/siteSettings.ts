import {CogIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField} from '../helpers'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: CogIcon,
  description:
    'Site-wide details: title, default share image, contact info, social and legal links. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'contact', title: 'Contact'},
    {name: 'social', title: 'Social'},
    {name: 'legal', title: 'Legal'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Site title',
      type: 'string',
      group: 'general',
      description: 'Used in the browser tab and as the fallback for share previews.',
      validation: (Rule) => Rule.required().error('Give the site a name.'),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: 'general',
      description: 'One short line. Shown as the fallback meta description and on social cards.',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      group: 'contact',
      description: 'Main contact inbox, shown in the footer (e.g. hello@brigada.be).',
      validation: (Rule) => Rule.email().error('That does not look like a valid email address.'),
    }),
    defineField({
      name: 'phone',
      title: 'Phone',
      type: 'string',
      group: 'contact',
      description: 'International format with country code, e.g. +32 2 123 45 67.',
    }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      group: 'social',
      description: 'Shown in the footer. Drag to reorder.',
      of: [defineArrayMember({type: 'socialLink'})],
    }),
    defineField({
      name: 'legalLinks',
      title: 'Legal links',
      type: 'array',
      group: 'legal',
      description:
        'Small print at the bottom of the footer (e.g. Privacy Policy, Cookies). Drag to reorder.',
      of: [defineArrayMember({type: 'legalLink'})],
    }),
    defineField({
      name: 'ogImage',
      title: 'Default share image',
      type: 'image',
      group: 'seo',
      description:
        'Used on social cards (Open Graph / Twitter) when a page does not set its own. 1200x630 works well.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Short description of the image - important for accessibility and SEO.',
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
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {
        title: 'Site Settings',
        subtitle: [title, locale?.toUpperCase()].filter(Boolean).join(' · ') || undefined,
      }
    },
  },
})
