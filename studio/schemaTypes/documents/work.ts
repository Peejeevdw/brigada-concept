import {CaseIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {languageVersionSubtitle, localeField, slugField} from '../helpers'

export const work = defineType({
  name: 'work',
  title: 'Work case',
  type: 'document',
  icon: CaseIcon,
  description:
    'A case study. Each language has its own document version; use Document translations to switch or create versions.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'layout', title: 'Case layout'},
    {name: 'projectInfo', title: 'Project info'},
    {name: 'related', title: 'Related'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    localeField(),
    defineField({
      name: 'name',
      title: 'Project title',
      type: 'string',
      group: 'general',
      description: 'Headline title of the case (e.g. "A new chapter for the driving machine").',
      validation: (Rule) => Rule.required().error('A title is needed for listings and the URL.'),
    }),
    slugField({
      group: 'general',
      source: 'name',
      docType: 'work',
      scopeField: 'locale',
      description: 'Used in the URL (/work/<slug>). Click Generate after filling in the title.',
    }),
    defineField({
      name: 'client',
      title: 'Client',
      type: 'string',
      group: 'general',
      description: 'Client name as shown in listings (e.g. "BMW", "Agristo").',
    }),
    defineField({
      name: 'image',
      title: 'Thumbnail / hero image',
      type: 'image',
      group: 'general',
      description:
        'Shown in the work grid and as the case-study hero. Landscape works best; use the hotspot to control cropping.',
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
      name: 'thumbnailVideo',
      title: 'Thumbnail video (optional)',
      type: 'object',
      group: 'general',
      description:
        'Optional: make the thumbnail an autoplaying, silent, looping video instead of a still — shown everywhere the thumbnail appears (work grid, homepage cases, related slider). The image above is the poster/fallback, so keep it set. Give a Vimeo ID OR a Bunny HLS URL — never both. There are never controls or sound.',
      options: {collapsible: true, collapsed: true},
      fields: [
        defineField({
          name: 'vimeoId',
          title: 'Video — Vimeo ID',
          type: 'string',
          description:
            'Just the number from the Vimeo URL — e.g. 123456789 for vimeo.com/123456789. For unlisted videos add the hash: 123456789/abcdef12. Plays as a muted autoplay loop, no controls.',
          validation: (Rule) =>
            Rule.custom((value, ctx) => {
              const parent = ctx.parent as {hlsUrl?: string} | undefined
              if (value && parent?.hlsUrl) {
                return 'Pick one source — either Vimeo or Bunny HLS. If both are set, the Vimeo video plays.'
              }
              return true
            }).warning(),
        }),
        defineField({
          name: 'hlsUrl',
          title: 'Video — Bunny HLS URL',
          type: 'url',
          description:
            'Bunny (or other) HLS playlist URL — the .m3u8 link from the video library. Plays as a muted autoplay loop, no controls. Pick this OR the Vimeo ID above, not both.',
        }),
      ],
    }),
    defineField({
      name: 'intro',
      title: 'Tagline',
      type: 'text',
      group: 'general',
      rows: 2,
      description:
        'One sentence that captures what this project is about. Keep it under ~140 characters.',
    }),
    defineField({
      name: 'serviceCategories',
      title: 'Service categories',
      type: 'array',
      group: 'general',
      description: 'Which service categories (Brand / Marketing / People / Product) this case belongs to. Pick at least one.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'serviceCategory'}]})],
      validation: (Rule) => Rule.min(1).error('Tag at least one service category.'),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'general',
      description: 'Year the project was delivered (e.g. 2025).',
      validation: (Rule) => Rule.min(1990).max(2100).integer(),
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'general',
      initialValue: false,
      description: 'Pins this case to the top of its service category page (e.g. /brand, /marketing). Has no effect on the homepage or /work index — those are curated/ordered separately.',
    }),
    // ---- New case layout: hero → project-info drawer → gallery rows ----
    defineField({
      name: 'darkMode',
      title: 'Dark mode',
      type: 'boolean',
      group: 'layout',
      initialValue: false,
      description: 'Black background with white text and buttons for the whole case page.',
    }),
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'caseHeroMedia',
      group: 'layout',
      description: 'Full-bleed image or video at the very top of the case.',
    }),
    defineField({
      name: 'projectInfo',
      title: 'Project info',
      type: 'object',
      group: 'projectInfo',
      description: 'Shown in the slide-in "Project info" drawer.',
      fields: [
        defineField({
          name: 'sections',
          title: 'Sections',
          type: 'array',
          description:
            'Collapsible sections, e.g. Summary, The challenge, The approach, The impact. The first one opens by default — put Summary on top.',
          of: [
            defineArrayMember({
              type: 'object',
              name: 'section',
              fields: [
                defineField({
                  name: 'heading',
                  title: 'Heading',
                  type: 'string',
                  validation: (Rule) => Rule.required(),
                }),
                defineField({
                  name: 'body',
                  title: 'Body',
                  type: 'text',
                  rows: 6,
                  description: 'Separate paragraphs with a blank line.',
                }),
              ],
              preview: {
                select: {title: 'heading', subtitle: 'body'},
              },
            }),
          ],
        }),
        defineField({
          name: 'services',
          title: 'Services involved',
          type: 'array',
          of: [defineArrayMember({type: 'string'})],
          options: {layout: 'tags'},
          description: 'Shown as a row, e.g. Launch · Employer branding · Live experience.',
        }),
      ],
    }),
    defineField({
      name: 'mediaRows',
      title: 'Gallery rows',
      type: 'array',
      group: 'layout',
      description:
        'Stacked rows of visuals below the title bar. Each row holds 1, 2 or 3 items (image or video) and lays out accordingly.',
      of: [defineArrayMember({type: 'galleryRow'})],
    }),
    defineField({
      name: 'related',
      title: 'Related work',
      type: 'array',
      group: 'related',
      description:
        'Curate up to ~3 cases to show at the bottom of this page. Leave empty to let the site pick automatically.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'work'}]})],
      validation: (Rule) => Rule.max(6).warning('More than six can feel cluttered.'),
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {title: 'name', year: 'year', locale: 'locale', media: 'image'},
    prepare({title, year, locale, media}) {
      return {
        title: title || 'Untitled case',
        subtitle: languageVersionSubtitle(locale, year ? String(year) : 'No year yet'),
        media,
      }
    },
  },
})
