import {defineField, type FieldDefinition} from 'sanity'

// Optional mobile overrides for a video field group: a single toggle reveals a
// mobile-specific source (mirroring whatever the desktop set offers) plus a
// mobile poster. Anything left blank falls back to the desktop value, so editors
// can override just the poster, just the video, or both. Shared by caseMedia,
// videoEmbed and the homePage reel so the UX is identical everywhere.
//
// `gateOnVideoKind` additionally hides the whole group unless the parent's
// `kind` is 'video' (caseMedia can also be an image).

type MobileParent = {kind?: string; mobileEnabled?: boolean}

type Options = {
  vimeo?: boolean // mobile Vimeo ID
  hls?: boolean // mobile HLS URL
  file?: boolean // mobile MP4/WebM upload
  loop?: boolean // mobile background-loop URL (reel)
  poster?: boolean // mobile poster image
  gateOnVideoKind?: boolean
}

export function mobileVideoFields({
  vimeo = false,
  hls = true,
  file = false,
  loop = false,
  poster = true,
  gateOnVideoKind = false,
}: Options = {}) {
  const kindHidden = (parent?: MobileParent) =>
    gateOnVideoKind && parent?.kind !== 'video'
  const toggleHidden = ({parent}: {parent?: MobileParent}) => kindHidden(parent)
  const fieldHidden = ({parent}: {parent?: MobileParent}) =>
    kindHidden(parent) || !parent?.mobileEnabled

  const fields: FieldDefinition[] = [
    defineField({
      name: 'mobileEnabled',
      title: 'Add a mobile version?',
      type: 'boolean',
      initialValue: false,
      description:
        'Off: the desktop video + poster are used on every screen. On: set mobile-specific sources and/or a mobile poster below — anything left blank falls back to the desktop version.',
      hidden: toggleHidden,
    }),
  ]

  if (vimeo) {
    fields.push(
      defineField({
        name: 'mobileVimeoId',
        title: 'Mobile — Vimeo ID',
        type: 'string',
        description:
          'Optional. Mobile-only Vimeo ID (add /hash for unlisted). Falls back to the desktop video when blank.',
        hidden: fieldHidden,
      }),
    )
  }
  if (hls) {
    fields.push(
      defineField({
        name: 'mobileHlsUrl',
        title: 'Mobile — HLS URL',
        type: 'url',
        description: 'Optional Bunny / Mux .m3u8 for mobile. Falls back to desktop when blank.',
        hidden: fieldHidden,
      }),
    )
  }
  if (file) {
    fields.push(
      defineField({
        name: 'mobileFile',
        title: 'Mobile — MP4 / WebM upload',
        type: 'file',
        options: {accept: 'video/*'},
        description: 'Optional mobile upload. Keep it small. Falls back to desktop when blank.',
        hidden: fieldHidden,
      }),
    )
  }
  if (loop) {
    fields.push(
      defineField({
        name: 'mobileLoopVideoUrl',
        title: 'Mobile — background loop URL',
        type: 'url',
        description: 'Optional mobile background-loop video. Falls back to desktop when blank.',
        hidden: fieldHidden,
      }),
    )
  }
  if (poster) {
    fields.push(
      defineField({
        name: 'mobilePoster',
        title: 'Mobile — poster image',
        type: 'image',
        options: {hotspot: true},
        description: 'Optional mobile placeholder. Falls back to the desktop poster when blank.',
        hidden: fieldHidden,
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
    )
  }

  return fields
}
