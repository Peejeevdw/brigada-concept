import {PlayIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const hero = defineType({
  name: 'hero',
  title: 'Hero',
  type: 'object',
  icon: PlayIcon,
  description: 'Big opening block — video or image with an optional headline overlay.',
  fields: [
    defineField({
      name: 'video',
      title: 'Background video',
      type: 'file',
      description:
        'MP4 or WebM. Keep it under ~10 MB for fast loading. Skip this if you only want a still image.',
      options: {accept: 'video/*'},
    }),
    defineField({
      name: 'poster',
      title: 'Poster image',
      type: 'image',
      description:
        'Shown before the video loads, and used as a fallback on devices with reduced data. Match the video’s aspect ratio.',
      options: {hotspot: true},
    }),
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      description: 'Optional. Overlaid on the video/image. Keep it short — under ~60 characters.',
    }),
  ],
  preview: {
    select: {title: 'title', media: 'poster'},
    prepare({title, media}) {
      return {
        title: title || 'Hero',
        subtitle: 'Hero block',
        media,
      }
    },
  },
})
