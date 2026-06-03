import {HomeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField, pageBuilderField} from '../helpers'

/**
 * Root page (/). Mirrors the "Concept" design: animated hero + reel + cases +
 * awards. Structured fields cover the fixed sections; the optional pageBuilder
 * at the bottom is there for one-off additions.
 */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,
  description: 'The landing page at /. Each language has its own version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'intro', title: 'Intro'},
    {name: 'reel', title: 'Reel'},
    {name: 'cases', title: 'Cases'},
    {name: 'awards', title: 'Awards'},
    {name: 'content', title: 'Extra content'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'title',
      title: 'Internal label',
      type: 'string',
      group: 'general',
      initialValue: 'Home page',
    }),
    // ---- Intro ----
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'object',
      group: 'intro',
      fields: [
        defineField({
          name: 'eyebrow',
          title: 'Eyebrow',
          type: 'string',
          description: 'Small label above the tagline (e.g. "Brigada is a").',
        }),
        defineField({
          name: 'taglines',
          title: 'Tagline lines',
          type: 'array',
          of: [defineArrayMember({type: 'string'})],
          description: 'Each entry becomes its own stacked line (e.g. "Sharp", "Beats", "Loud").',
          validation: (Rule) =>
            Rule.min(1).error('Add at least one tagline line.').max(4).warning('More than four feels heavy.'),
        }),
        defineField({
          name: 'paragraph',
          title: 'Paragraph',
          type: 'text',
          rows: 3,
          description: 'Short paragraph under the tagline.',
        }),
      ],
    }),
    // ---- Reel ----
    defineField({
      name: 'reel',
      title: 'Reel',
      type: 'object',
      group: 'reel',
      fields: [
        defineField({
          name: 'poster',
          title: 'Poster image',
          type: 'image',
          description: 'Still shown before the reel plays.',
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
        defineField({
          name: 'hlsUrl',
          title: 'HLS playlist URL',
          type: 'url',
          description: 'Bunny CDN .m3u8 playlist for the reel video.',
        }),
        defineField({
          name: 'loopVideoUrl',
          title: 'Background loop URL',
          type: 'url',
          description:
            'Optional muted-loop video shown in the section background (e.g. /sharp-beats-loud.mp4).',
        }),
      ],
    }),
    // ---- Cases ----
    defineField({
      name: 'cases',
      title: 'Cases section',
      type: 'object',
      group: 'cases',
      fields: [
        defineField({
          name: 'title',
          title: 'Section title',
          type: 'string',
          description: 'E.g. "Latest cases".',
        }),
        defineField({
          name: 'items',
          title: 'Cases',
          type: 'array',
          description: 'Cases shown in the stacking-cards section.',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'caseEntry',
              fields: [
                defineField({
                  name: 'work',
                  title: 'Work case',
                  type: 'reference',
                  to: [{type: 'work'}],
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'backgroundType',
                  title: 'Background',
                  type: 'string',
                  options: {
                    list: [
                      {title: 'Solid colour', value: 'color'},
                      {title: 'Looping video', value: 'video'},
                      {title: 'Image', value: 'image'},
                    ],
                    layout: 'radio',
                  },
                  initialValue: 'color',
                }),
                defineField({
                  name: 'bgColor',
                  title: 'Background colour',
                  type: 'string',
                  description: 'Hex (e.g. "#1A232E") or CSS background value.',
                  hidden: ({parent}) => parent?.backgroundType !== 'color',
                }),
                defineField({
                  name: 'bgVideo',
                  title: 'Background video',
                  type: 'file',
                  options: {accept: 'video/*'},
                  hidden: ({parent}) => parent?.backgroundType !== 'video',
                }),
                defineField({
                  name: 'bgImage',
                  title: 'Background image',
                  type: 'image',
                  options: {hotspot: true},
                  hidden: ({parent}) => parent?.backgroundType !== 'image',
                }),
                defineField({
                  name: 'fgColor',
                  title: 'Text colour',
                  type: 'string',
                  description: 'Hex for the text overlay on top of the background.',
                }),
                defineField({
                  name: 'trail',
                  title: 'Cursor trail images',
                  type: 'array',
                  description:
                    'Set of images that follow the cursor on hover (Osmo "Rotating Image Trail").',
                  of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
                  validation: (Rule) => Rule.max(8).warning('More than eight is overkill.'),
                }),
              ],
              preview: {
                select: {title: 'work.name', media: 'work.image'},
                prepare({title, media}) {
                  return {title: title || 'Case', media}
                },
              },
            }),
          ],
          validation: (Rule) =>
            Rule.min(1)
              .warning('Empty cases section will not render.')
              .max(8)
              .warning('More than eight feels heavy.'),
        }),
      ],
    }),
    // ---- Awards ----
    defineField({
      name: 'awards',
      title: 'Awards section',
      type: 'object',
      group: 'awards',
      fields: [
        defineField({
          name: 'eyebrow',
          title: 'Eyebrow',
          type: 'string',
          description: 'E.g. "Proud not loud".',
        }),
        defineField({name: 'title', title: 'Section title', type: 'string'}),
        defineField({name: 'description', title: 'Description', type: 'text', rows: 2}),
        defineField({
          name: 'items',
          title: 'Awards',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'award',
              fields: [
                defineField({
                  name: 'year',
                  title: 'Year',
                  type: 'string',
                  description: 'E.g. "2026".',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'organization',
                  title: 'Organization',
                  type: 'string',
                  description: 'E.g. "Cannes Lions".',
                }),
                defineField({
                  name: 'title',
                  title: 'Award title',
                  type: 'string',
                  description: 'E.g. "Gold, Film Craft, for Volvo".',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'image',
                  title: 'Preview image',
                  type: 'image',
                  description: 'Case visual shown in the cursor follower on hover.',
                  options: {hotspot: true},
                }),
                defineField({
                  name: 'work',
                  title: 'Related case (optional)',
                  type: 'reference',
                  to: [{type: 'work'}],
                  description: 'If this award is linked to a specific case, reference it here.',
                }),
              ],
              preview: {
                select: {year: 'year', org: 'organization', title: 'title', media: 'image'},
                prepare({year, org, title, media}) {
                  return {
                    title: title || 'Award',
                    subtitle: [year, org].filter(Boolean).join(' · '),
                    media,
                  }
                },
              },
            }),
          ],
        }),
      ],
    }),
    pageBuilderField({
      group: 'content',
      description: 'Optional extra blocks — leave empty for the standard homepage layout.',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {title: 'title', locale: 'locale'},
    prepare({title, locale}) {
      return {title: title || 'Home page', subtitle: locale ? `/${locale}` : '/'}
    },
  },
})
