import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Press release — a standalone, editorially-managed press page that lives at
 * `/press/<slug>`. Modelled on the /employer-branding idiom: a full-bleed
 * hero photo with the headline overlaid, a two-column body (release copy +
 * inline quotes on the left, a portrait on the right) and a downloadable
 * press kit (logo / video / images).
 *
 * The frontend route at `app/press/[slug]/page.tsx` resolves this by slug and
 * renders `src/views/PressRelease.tsx`. If no press release matches a slug it
 * falls back to a `landingPage` at `press/<slug>`, so legacy landing pages
 * keep working.
 */
export const pressRelease = defineType({
  name: 'pressRelease',
  title: 'Press release',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'general', title: 'General', default: true},
    {name: 'hero', title: 'Hero'},
    {name: 'content', title: 'Content'},
    {name: 'presskit', title: 'Press kit'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Internal title',
      type: 'string',
      group: 'general',
      description: 'Used in the Studio list and as a fallback page title.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      group: 'general',
      description: 'The page lives at /press/<slug>, e.g. "launch" → /press/launch.',
      options: {source: 'title', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishDate',
      title: 'Publish date',
      type: 'date',
      group: 'general',
      description: 'Shown in the eyebrow as "Press release · 16 June 2026".',
      options: {dateFormat: 'D MMMM YYYY'},
    }),
    defineField({
      name: 'noindex',
      title: 'Hide from search engines',
      type: 'boolean',
      group: 'general',
      description: 'Keep on during an embargo; switch off when the release goes public.',
      initialValue: true,
    }),

    // ---- Hero ----
    defineField({
      name: 'heroTitle',
      title: 'Headline',
      type: 'text',
      rows: 2,
      group: 'hero',
      description: 'The big white headline overlaid on the hero photo.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'hero',
      options: {hotspot: true},
      description: 'Full-bleed background photo for the hero.',
      fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
    }),

    // ---- Body (left column) ----
    defineField({
      name: 'body',
      title: 'Release body',
      type: 'array',
      group: 'content',
      description:
        'The release copy for the left column. Add paragraphs, and insert quote blocks (with author + role) where they belong.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h2'},
          ],
          lists: [],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
            ],
          },
        }),
        defineArrayMember({type: 'quote'}),
      ],
    }),

    // ---- Portrait (right column) ----
    defineField({
      name: 'portrait',
      title: 'Portrait',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      description: 'Sits in the right column next to the release copy.',
      fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
    }),
    defineField({
      name: 'portraitCaption',
      title: 'Portrait caption',
      type: 'string',
      group: 'content',
    }),

    // ---- Press kit ----
    defineField({
      name: 'pressKit',
      title: 'Press kit downloads',
      type: 'array',
      group: 'presskit',
      description: 'Logo, video and image downloads. Upload a file or point to an external URL.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'download',
          title: 'Download',
          icon: DocumentTextIcon,
          fields: [
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'e.g. "Logo package", "Launch video", "Press images".',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'meta',
              title: 'Meta',
              type: 'string',
              description: 'e.g. "SVG · PNG · EPS" or "MP4 · 1080p".',
            }),
            defineField({
              name: 'file',
              title: 'File',
              type: 'file',
              description: 'Upload the asset. Takes priority over the external URL below.',
            }),
            defineField({
              name: 'url',
              title: 'External URL',
              type: 'url',
              description: 'Optional — used when no file is uploaded (e.g. a WeTransfer / Drive link).',
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'meta'},
          },
        }),
      ],
    }),

    defineField({name: 'seo', title: 'SEO', type: 'seo', group: 'seo'}),
  ],
  preview: {
    select: {title: 'title', slug: 'slug.current', noindex: 'noindex', media: 'heroImage'},
    prepare({title, slug, noindex, media}) {
      return {
        title: title || 'Press release',
        subtitle: [slug ? `/press/${slug}` : '— no slug —', noindex ? 'noindex' : null]
          .filter(Boolean)
          .join(' · '),
        media,
      }
    },
  },
})
