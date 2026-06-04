import {CaseIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {
  WORK_GROUPS,
  languageVersionSubtitle,
  localeField,
  pageBuilderField,
  slugField,
} from '../helpers'

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
    {name: 'content', title: 'Case story'},
    {name: 'gallery', title: 'Gallery'},
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
      name: 'intro',
      title: 'Tagline',
      type: 'text',
      group: 'general',
      rows: 2,
      description:
        'One sentence that captures what this project is about. Keep it under ~140 characters.',
    }),
    defineField({
      name: 'expertises',
      title: 'Expertises',
      type: 'array',
      group: 'general',
      description: 'Which expertises this case belongs to. Pick at least one.',
      of: [defineArrayMember({type: 'reference', to: [{type: 'expertise'}]})],
      validation: (Rule) => Rule.min(1).error('Tag at least one expertise.'),
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
      name: 'code',
      title: 'Project code',
      type: 'string',
      group: 'general',
      description: 'Internal reference in the format BRGD.XXX (e.g. BRGD.001).',
      validation: (Rule) =>
        Rule.regex(/^BRGD\.\d{3}$/, {name: 'project code'}).error(
          'Use the format BRGD followed by a dot and three digits, e.g. BRGD.012.',
        ),
    }),
    defineField({
      name: 'gradient',
      title: 'Gradient',
      type: 'string',
      group: 'general',
      description: 'Gradient token name used for the case hero accent. Ask design if unsure.',
    }),
    defineField({
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      group: 'general',
      initialValue: false,
      description: 'Featured cases are surfaced on the homepage and at the top of the work index.',
    }),
    defineField({
      name: 'services',
      title: 'Services delivered',
      type: 'array',
      group: 'general',
      description: 'Grouped per pillar — keep the labels short.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'service',
          fields: [
            defineField({
              name: 'pillar',
              title: 'Pillar',
              type: 'reference',
              to: [{type: 'expertise'}],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Service title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {title: 'title', pillar: 'pillar.name'},
            prepare({title, pillar}) {
              return {title: title || 'Service', subtitle: pillar || ''}
            },
          },
        }),
      ],
    }),
    // ---- Case story (page-builder body) ----
    // Free composition: stack rich-text, image, image-grid, video, quote and
    // stat blocks in any order. The four-chapter pattern (brief / approach /
    // context / outcome) lives as conventional headings inside richText
    // blocks, not as required fields.
    // ---- New case layout: hero → project-info drawer → gallery rows ----
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'caseMedia',
      group: 'layout',
      description: 'Full-bleed image or video at the very top of the case.',
    }),
    defineField({
      name: 'projectInfo',
      title: 'Project info',
      type: 'object',
      group: 'layout',
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
    pageBuilderField({
      name: 'body',
      title: 'Case story',
      group: 'content',
      description:
        'Build the case story out of blocks. Drag to reorder; mix rich text, images, video, quotes and stats freely.',
    }),
    // ---- Standalone gallery (the row of images at the bottom of the case) ----
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'gallery',
      description:
        'Photo strip shown below the case story. Five images works best for the current layout.',
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
            defineField({name: 'caption', title: 'Caption', type: 'string'}),
          ],
        }),
      ],
      validation: (Rule) =>
        Rule.max(12).warning('The current layout shows ~5 images; more is fine but heavy.'),
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
    select: {title: 'name', code: 'code', year: 'year', locale: 'locale', media: 'image'},
    prepare({title, code, year, locale, media}) {
      const bits = [code, year].filter(Boolean).join(' · ')
      return {
        title: title || 'Untitled case',
        subtitle: languageVersionSubtitle(locale, bits || 'No code or year yet'),
        media,
      }
    },
  },
})
