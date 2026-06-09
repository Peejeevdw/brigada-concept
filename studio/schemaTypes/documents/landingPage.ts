import {DocumentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {API_VERSION, pageBuilderField} from '../helpers'

/**
 * Landing page — standalone modular page that lives at any URL path the editor
 * chooses (e.g. `press/launch`, `agency/services`, `summer-campaign`). Not
 * surfaced in navigation; reachable only by direct link or as a catch-all
 * receiver for legacy URLs.
 *
 * The slug holds the FULL path (no leading slash, slashes allowed inside).
 * The frontend catch-all route at `app/[...path]/page.tsx` resolves it.
 */
export const landingPage = defineType({
  name: 'landingPage',
  title: 'Landing page',
  type: 'document',
  icon: DocumentIcon,
  description:
    'A standalone page built from modular blocks. Lives at the URL you set in the slug.',
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'content', title: 'Content'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'general',
      description: 'Internal title — also used as the page heading unless the hero overrides it.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL path',
      type: 'slug',
      group: 'general',
      description:
        'The full path under the site root, without a leading slash. Use slashes for nesting, e.g. "press/launch" or "agency/services-history".',
      options: {
        source: 'title',
        maxLength: 200,
        slugify: (input) =>
          input
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            // Keep slashes; collapse other separators to hyphens.
            .replace(/[^a-z0-9/]+/g, '-')
            // Trim leading/trailing slashes and hyphens.
            .replace(/^[-/]+|[-/]+$/g, '')
            // Collapse repeated slashes / mixed separators.
            .replace(/\/+/g, '/')
            .replace(/-+/g, '-'),
        isUnique: async (slug, context) => {
          const {document, getClient} = context
          const client = getClient({apiVersion: API_VERSION})
          const id = document?._id?.replace(/^drafts\./, '') ?? ''
          if (!id) return true
          try {
            const count = await client.fetch<number>(
              `count(*[_type == "landingPage" && slug.current == $slug && !(_id in [$id, $draftId])])`,
              {slug, id, draftId: `drafts.${id}`},
            )
            return count === 0
          } catch (error) {
            console.error('Slug uniqueness check failed for landingPage:', error)
            return true
          }
        },
      },
      validation: (Rule) =>
        Rule.required()
          .custom((value) => {
            const current = (value as {current?: string} | undefined)?.current
            if (!current) return 'A URL path is needed.'
            if (current.startsWith('/')) return 'Drop the leading slash.'
            if (!/^[a-z0-9/-]+$/.test(current))
              return 'Use only lowercase letters, numbers, hyphens and slashes.'
            // Block paths that collide with existing top-level routes — the
            // catch-all only fires when no other route matches, but it's
            // friendlier to flag the conflict here.
            const reserved = new Set([
              'about',
              'api',
              'brand',
              'careers',
              'contact',
              'cookies',
              'employer-branding',
              'marketing',
              'people',
              'privacy',
              'product',
              'services',
              'studio',
              'work',
              'work-lab',
            ])
            const firstSegment = current.split('/')[0]
            if (reserved.has(firstSegment))
              return `"${firstSegment}" is a reserved top-level path. Nest under a different segment.`
            return true
          })
          .error(),
    }),
    defineField({
      name: 'noindex',
      title: 'Hide from search engines',
      type: 'boolean',
      group: 'general',
      description: 'When on, the page emits a noindex meta tag. Use for one-off / private launches.',
      initialValue: false,
    }),

    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      description: 'Optional. Leave empty to start the page straight with the content blocks.',
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
        defineField({name: 'title', title: 'Headline', type: 'string'}),
        defineField({name: 'intro', title: 'Intro paragraph', type: 'text', rows: 3}),
        defineField({
          name: 'image',
          title: 'Hero image',
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
        }),
      ],
      options: {collapsible: true, collapsed: false},
    }),

    pageBuilderField({
      name: 'body',
      title: 'Body',
      group: 'content',
      description:
        'Modular content blocks. Stack rich text, images, video, quotes and stats in any order.',
    }),

    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {title: 'title', slug: 'slug.current', noindex: 'noindex'},
    prepare({title, slug, noindex}) {
      return {
        title: title || 'Landing page',
        subtitle: [slug ? `/${slug}` : '— no path —', noindex ? 'noindex' : null]
          .filter(Boolean)
          .join(' · '),
      }
    },
  },
})
