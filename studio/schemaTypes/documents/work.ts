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
  groups: WORK_GROUPS,
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
      name: 'image',
      title: 'Thumbnail / hero image',
      type: 'image',
      group: 'general',
      description:
        'Shown in the work grid and as the case-study hero. Landscape works best; use the hotspot to control cropping.',
      options: {hotspot: true},
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
    pageBuilderField({
      name: 'brief',
      title: 'Brief — what the client asked for',
      group: 'content',
      description:
        'The challenge in the client’s words. Drop in blocks the same way you would on a page.',
    }),
    pageBuilderField({
      name: 'approach',
      title: 'Approach — how we tackled it',
      group: 'content',
      description: 'Our strategy, methodology and the work itself.',
    }),
    pageBuilderField({
      name: 'context',
      title: 'Context — the wider picture',
      group: 'content',
      description: 'Market, audience or moment-in-time context that shaped the work.',
    }),
    pageBuilderField({
      name: 'outcome',
      title: 'Outcome — what changed',
      group: 'content',
      description: 'Results, impact and proof points. Numbers and quotes welcome.',
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
