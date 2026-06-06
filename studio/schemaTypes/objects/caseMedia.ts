import {ImageIcon} from '@sanity/icons'
import {defineField, defineType, type FieldDefinition} from 'sanity'
import {mobileVideoFields} from './mobileVideoFields'

// A single visual that is either an image or a video. The case hero and every
// gallery-row item share the same field shape; only the editor notes differ
// (the hero has fixed aspect-ratio / size requirements, the gallery doesn't),
// so the fields are built by one factory and exported as two types:
//   • caseMedia      — gallery-row items (no ratio notes)
//   • caseHeroMedia  — the case hero (16:9 desktop / 4:5 mobile notes)
// Video follows the `videoEmbed` pattern: a Vimeo ID or HLS URL (no uploads).

type MediaNotes = {
  videoNote?: string // appended to the desktop video source descriptions
  posterNote?: string // appended to the desktop poster description
  mobileSourceNote?: string // appended to the mobile video source descriptions
  mobilePosterNote?: string // appended to the mobile poster description
}

const withNote = (base: string, note?: string) => (note ? `${base} ${note}` : base)

function caseMediaFields(notes: MediaNotes = {}): FieldDefinition[] {
  return [
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          {title: 'Image', value: 'image'},
          {title: 'Video', value: 'video'},
        ],
        layout: 'radio',
      },
      initialValue: 'image',
      validation: (Rule) => Rule.required(),
    }),

    // ---- Image ----
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      hidden: ({parent}) => parent?.kind !== 'image',
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

    // ---- Video ----
    defineField({
      name: 'vimeoId',
      title: 'Video — Vimeo ID',
      type: 'string',
      description: withNote(
        'Just the number from the Vimeo URL — e.g. 123456789 for vimeo.com/123456789. For unlisted videos add the hash: 123456789/abcdef12. Plays as a muted autoplay loop. Wins over everything else when set.',
        notes.videoNote,
      ),
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'hlsUrl',
      title: '⚠️ Video — HLS URL (don’t use)',
      type: 'url',
      description:
        'Don’t use — kept only so existing cases keep working. For new videos use the Vimeo ID above.',
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'poster',
      title: 'Video — poster image',
      type: 'image',
      options: {hotspot: true},
      description: withNote('Shown before the video loads.', notes.posterNote),
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'showControls',
      title: 'Video — show player controls',
      type: 'boolean',
      initialValue: false,
      description:
        'Off (default): plays as a silent, looping background clip with no chrome, like the other case videos. On: keeps autoplay + muted but shows the Vimeo controls, so visitors can pause, scrub and unmute. Only applies to Vimeo videos.',
      hidden: ({parent}) => parent?.kind !== 'video',
    }),

    // ---- Mobile overrides (optional) ----
    ...mobileVideoFields({
      vimeo: true,
      hls: true,
      file: false,
      poster: true,
      gateOnVideoKind: true,
      sourceNote: notes.mobileSourceNote,
      posterNote: notes.mobilePosterNote,
      hlsNote:
        'Don’t use — kept only so existing cases keep working. For new videos use the Mobile Vimeo ID above.',
    }),
  ]
}

const caseMediaPreview = {
  select: {kind: 'kind', image: 'image', poster: 'poster'},
  prepare({kind, image, poster}: {kind?: string; image?: unknown; poster?: unknown}) {
    return {
      title: kind === 'video' ? 'Video' : 'Image',
      media: (image || poster) as never,
    }
  },
}

// Gallery-row item — no fixed-ratio requirements.
export const caseMedia = defineType({
  name: 'caseMedia',
  title: 'Media',
  type: 'object',
  icon: ImageIcon,
  fields: caseMediaFields(),
  preview: caseMediaPreview,
})

// Case hero — fixed aspect ratios so the full-bleed hero looks right.
export const caseHeroMedia = defineType({
  name: 'caseHeroMedia',
  title: 'Hero media',
  type: 'object',
  icon: ImageIcon,
  fields: caseMediaFields({
    videoNote: 'Use a 16:9 video.',
    posterNote: 'Ratio 16:9 — 3840 × 2160 px.',
    mobileSourceNote: 'Use a 4:5 (portrait) video.',
    mobilePosterNote: 'Ratio 4:5 — 2000 × 2500 px.',
  }),
  preview: caseMediaPreview,
})
