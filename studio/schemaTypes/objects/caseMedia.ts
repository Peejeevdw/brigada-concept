import {ImageIcon} from '@sanity/icons'
import {defineField, defineType, type FieldDefinition} from 'sanity'
import {mobileVideoFields} from './mobileVideoFields'

// A single visual that is either an image or a video. The case hero and every
// gallery-row item share the same field shape; only the editor notes differ
// (the hero has fixed aspect-ratio / size requirements, the gallery doesn't),
// so the fields are built by one factory and exported as two types:
//   • caseMedia      — gallery-row items (no ratio notes)
//   • caseHeroMedia  — the case hero (16:9 desktop / 4:5 mobile notes)
//
// Video sources: Vimeo ID and Bunny HLS URL are treated as equally valid.
// Editors pick one per item. If both are filled the Vimeo source plays (it
// has richer player features) — a validation warning surfaces this so the
// editor can clear the field they didn't mean to keep.

type MediaNotes = {
  videoNote?: string // appended to the desktop video source descriptions
  posterNote?: string // appended to the desktop poster description
  mobileSourceNote?: string // appended to the mobile video source descriptions
  mobilePosterNote?: string // appended to the mobile poster description
  /** Hide the "show player controls" toggle. Used on the case hero, which
   *  always plays as a silent background loop with no chrome. */
  hideControlsToggle?: boolean
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
    defineField({
      name: 'mobileImage',
      title: 'Mobile image (optional)',
      type: 'image',
      options: {hotspot: true},
      description: withNote(
        'Optional mobile-specific image — used on small screens instead of the image above. Falls back to the image above when blank.',
        notes.mobilePosterNote,
      ),
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

    // ---- Video source (Vimeo OR Bunny — pick one) ----
    defineField({
      name: 'vimeoId',
      title: 'Video — Vimeo ID',
      type: 'string',
      description: withNote(
        'Just the number from the Vimeo URL — e.g. 123456789 for vimeo.com/123456789. For unlisted videos add the hash: 123456789/abcdef12. Plays as a muted autoplay loop.',
        notes.videoNote,
      ),
      hidden: ({parent}) => parent?.kind !== 'video',
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
        'Bunny (or other) HLS playlist URL — the .m3u8 link from the video library. Plays as a muted autoplay loop. Pick this OR the Vimeo ID above, not both.',
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
    ...(notes.hideControlsToggle
      ? []
      : [
          defineField({
            name: 'showControls',
            title: 'Video — show player controls',
            type: 'boolean',
            initialValue: false,
            description:
              'Off (default): plays as a silent, looping background clip with no chrome, like the other case videos. On: keeps autoplay + muted but shows the player controls, so visitors can pause, scrub and unmute. Works for both Vimeo and Bunny HLS videos.',
            hidden: ({parent}) => parent?.kind !== 'video',
          }),
        ]),

    // ---- Mobile overrides (optional) ----
    ...mobileVideoFields({
      vimeo: true,
      hls: true,
      file: false,
      poster: true,
      gateOnVideoKind: true,
      sourceNote: notes.mobileSourceNote,
      posterNote: notes.mobilePosterNote,
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
    // The hero defaults to a silent background loop, but the controls toggle is
    // available so an editor can opt into a playable hero (Vimeo or Bunny HLS).
  }),
  preview: caseMediaPreview,
})
