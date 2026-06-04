import {ImageIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

// A single visual that is either an image or a video. Reused by the case hero
// and by every item inside a gallery row. Video follows the same pattern as the
// `videoEmbed` block: an HLS URL wins, otherwise the uploaded file plays.
export const caseMedia = defineType({
  name: 'caseMedia',
  title: 'Media',
  type: 'object',
  icon: ImageIcon,
  fields: [
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
      description:
        'Just the number from the Vimeo URL — e.g. 123456789 for vimeo.com/123456789. For unlisted videos add the hash: 123456789/abcdef12. Plays as a muted autoplay loop, like the Bunny clips. Wins over everything else when set.',
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'hlsUrl',
      title: 'Video — HLS URL',
      type: 'url',
      description: 'Bunny / Mux .m3u8 playlist. Used when no Vimeo URL is set.',
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'file',
      title: 'Video — MP4 / WebM upload',
      type: 'file',
      options: {accept: 'video/*'},
      description: 'Used when no HLS URL is set. Keep it reasonably small.',
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
    defineField({
      name: 'poster',
      title: 'Video — poster image',
      type: 'image',
      options: {hotspot: true},
      description: 'Shown before the video loads.',
      hidden: ({parent}) => parent?.kind !== 'video',
    }),
  ],
  preview: {
    select: {kind: 'kind', image: 'image', poster: 'poster'},
    prepare({kind, image, poster}) {
      return {
        title: kind === 'video' ? 'Video' : 'Image',
        media: image || poster,
      }
    },
  },
})
