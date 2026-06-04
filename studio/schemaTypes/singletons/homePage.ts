import {HomeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {localeField} from '../helpers'
import {mobileVideoFields} from '../objects/mobileVideoFields'

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
          name: 'paragraphLines',
          title: 'Paragraph lines',
          type: 'array',
          description:
            'One entry per visual line under the tagline. The line is rendered without wrapping; the auto-fit logic scales the widest line to fill the viewport, so keep entries roughly balanced.',
          of: [defineArrayMember({type: 'string'})],
          validation: (Rule) =>
            Rule.min(1).error('Add at least one line.').max(4).warning('More than four feels heavy.'),
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

        // ---- Mobile overrides (optional) ----
        ...mobileVideoFields({hls: true, loop: true, poster: true}),
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
                  name: 'brioColors',
                  title: 'Brio colours',
                  type: 'array',
                  description:
                    'Hex stops fed into the WebGL Brio gradient behind the case. Add 2 to 7 colours; the system orders them by luminance and interpolates.',
                  of: [
                    defineArrayMember({
                      type: 'string',
                      validation: (Rule) =>
                        Rule.regex(/^#?[0-9a-f]{6}$/i, {name: 'hex colour'}).error(
                          'Use 6-digit hex like #1A232E.',
                        ),
                    }),
                  ],
                  validation: (Rule) =>
                    Rule.min(2)
                      .error('Add at least two colours so Brio has something to interpolate.')
                      .max(7)
                      .warning('Brio only blends up to 7 stops; extras are ignored.'),
                }),
                defineField({
                  name: 'fgColor',
                  title: 'Text colour',
                  type: 'string',
                  description: 'Colour of the case label + tags overlay on top of the Brio backdrop.',
                  options: {
                    list: [
                      {title: 'Black', value: '#181614'},
                      {title: 'White', value: '#FFFFFF'},
                    ],
                    layout: 'radio',
                  },
                  initialValue: '#FFFFFF',
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
