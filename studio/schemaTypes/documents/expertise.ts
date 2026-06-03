import {StarIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {languageVersionSubtitle, localeField, slugField} from '../helpers'

const BRIO_PALETTES = [
  {title: 'Brio 02 (people accent)', value: 'brio-02'},
  {title: 'Brio 03 (product accent)', value: 'brio-03'},
  {title: 'Brio 04 (marketing accent)', value: 'brio-04'},
  {title: 'Brio 05 (contact accent)', value: 'brio-05'},
  {title: 'Brio 06 (brand accent)', value: 'brio-06'},
] as const

export const expertise = defineType({
  name: 'expertise',
  title: 'Expertise',
  type: 'document',
  icon: StarIcon,
  description:
    'A pillar (Brand / Product / People / Marketing). Each language has its own document version.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'content', title: 'Pillar page'},
    {name: 'cases', title: 'Cases'},
    {name: 'settings', title: 'Settings'},
    {name: 'seo', title: 'SEO'},
  ],
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
        'Used in the URL (/<slug>, e.g. /brand). Click Generate to derive it from the name.',
    }),
    defineField({
      name: 'image',
      title: 'Hero image',
      type: 'image',
      group: 'content',
      description:
        'Shown at the top of the pillar page and in listings. Landscape works best — use the hotspot for cropping.',
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
    // ---- Hero copy ----
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'content',
      description: 'Small label above the headline (e.g. "How we move your").',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: 'content',
      description: 'Pillar tagline (e.g. "the source of movement").',
    }),
    defineField({
      name: 'intro',
      title: 'Intro paragraph',
      type: 'text',
      rows: 3,
      group: 'content',
      description: 'One- or two-sentence intro shown on the overview and at the top of the pillar page.',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
      group: 'content',
      description: 'Optional long-form copy below the services list. Headings, lists, quotes — go to town.',
    }),
    // ---- Services ----
    defineField({
      name: 'servicesIntro',
      title: 'Services intro',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One- or two-sentence intro shown above the services list.',
    }),
    defineField({
      name: 'services',
      title: 'Services',
      type: 'array',
      group: 'content',
      description: 'What this pillar delivers, in display order.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'service',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'description',
              title: 'Subline',
              type: 'text',
              rows: 2,
              description: 'One short sentence shown under the title.',
            }),
          ],
          preview: {
            select: {title: 'title', subtitle: 'description'},
            prepare({title, subtitle}) {
              return {title: title || 'Service', subtitle: subtitle?.slice(0, 80) || ''}
            },
          },
        }),
      ],
    }),
    // ---- Cases section ----
    defineField({
      name: 'cases',
      title: 'Cases section',
      type: 'object',
      group: 'cases',
      description: 'Controls the case carousel on the pillar page.',
      fields: [
        defineField({
          name: 'mode',
          title: 'Mode',
          type: 'string',
          options: {
            list: [
              {title: 'Curated — pick the cases yourself', value: 'curated'},
              {title: 'Recent — pull recent cases tagged with this pillar', value: 'recent'},
              {title: 'All — every case tagged with this pillar', value: 'all'},
              {title: 'Hidden', value: 'hidden'},
            ],
            layout: 'radio',
          },
          initialValue: 'recent',
        }),
        defineField({
          name: 'title',
          title: 'Section title',
          type: 'string',
          description: 'E.g. "Selected work" or "Recent cases".',
        }),
        defineField({
          name: 'curated',
          title: 'Curated cases',
          type: 'array',
          of: [defineArrayMember({type: 'reference', to: [{type: 'work'}]})],
          hidden: ({parent}) => parent?.mode !== 'curated',
          validation: (Rule) =>
            Rule.custom((value, ctx) => {
              const parent = ctx.parent as {mode?: string} | undefined
              if (parent?.mode !== 'curated') return true
              return value && value.length > 0 ? true : 'Pick at least one case.'
            }),
        }),
        defineField({
          name: 'limit',
          title: 'Max cases',
          type: 'number',
          description: 'How many cases to show (recent/all modes).',
          initialValue: 6,
          validation: (Rule) => Rule.min(1).max(20).integer(),
          hidden: ({parent}) => parent?.mode === 'curated' || parent?.mode === 'hidden',
        }),
      ],
    }),
    // ---- Pillar visuals ----
    defineField({
      name: 'brioPaletteId',
      title: 'Brio palette',
      type: 'string',
      group: 'settings',
      description: 'Which brio colour-palette token the pillar footer + accents use.',
      options: {list: [...BRIO_PALETTES]},
    }),
    defineField({
      name: 'lead',
      title: 'Lead contact',
      type: 'reference',
      group: 'settings',
      to: [{type: 'person'}],
      description: 'Person to contact for this pillar. Shown on the pillar + contact pages.',
    }),
    defineField({
      name: 'leadIn',
      title: 'Lead-in copy',
      type: 'text',
      rows: 2,
      group: 'settings',
      description:
        'Short copy shown next to the lead contact. Use the placeholder {name} where the lead\'s first name should appear.',
      initialValue: '{name} is the person to talk to.',
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
    defineField({
      name: 'links',
      title: 'Related links',
      type: 'array',
      group: 'settings',
      description: 'Optional links shown alongside the body (case studies, downloads, etc.).',
      of: [defineArrayMember({type: 'link'})],
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
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
