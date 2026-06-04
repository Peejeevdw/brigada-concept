import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {mobileVideoFields} from '../mobileVideoFields'

export const videoEmbed = defineType({
  name: 'videoEmbed',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  description: 'A full-bleed video. Use a Bunny HLS playlist, an MP4 upload, or both — HLS wins when set.',
  fields: [
    defineField({
      name: 'hlsUrl',
      title: 'HLS playlist URL',
      type: 'url',
      description: 'Bunny / Mux / other HLS .m3u8 URL.',
    }),
    defineField({
      name: 'file',
      title: 'MP4 / WebM upload',
      type: 'file',
      options: {accept: 'video/*'},
      description: 'Used when no HLS URL is set. Keep under ~10 MB.',
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      type: 'image',
      description: 'Shown before the video loads or on reduced-data devices.',
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
      name: 'aspect',
      title: 'Aspect ratio',
      type: 'string',
      options: {
        list: [
          {title: '16:9 (standard)', value: '16/9'},
          {title: '21:9 (cinema)', value: '21/9'},
          {title: '4:5 (portrait)', value: '4/5'},
          {title: '1:1 (square)', value: '1/1'},
        ],
        layout: 'radio',
      },
      initialValue: '16/9',
    }),
    defineField({
      name: 'autoplay',
      title: 'Autoplay (muted loop)',
      type: 'boolean',
      initialValue: true,
    }),

    // ---- Mobile overrides (optional) ----
    ...mobileVideoFields({hls: true, file: true, poster: true}),
  ],
  preview: {
    select: {hls: 'hlsUrl', media: 'poster', aspect: 'aspect'},
    prepare({hls, media, aspect}) {
      return {
        title: hls ? 'Video (HLS)' : 'Video',
        subtitle: aspect,
        media,
      }
    },
  },
})
