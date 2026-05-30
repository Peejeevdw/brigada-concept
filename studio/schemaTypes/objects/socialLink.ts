import {LinkIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const SOCIAL_PLATFORMS = [
  {title: 'LinkedIn', value: 'linkedin'},
  {title: 'Instagram', value: 'instagram'},
  {title: 'Facebook', value: 'facebook'},
  {title: 'X / Twitter', value: 'x'},
  {title: 'YouTube', value: 'youtube'},
  {title: 'TikTok', value: 'tiktok'},
  {title: 'GitHub', value: 'github'},
  {title: 'Other', value: 'other'},
] as const

const PLATFORM_TITLES: Record<string, string> = Object.fromEntries(
  SOCIAL_PLATFORMS.map((p) => [p.value, p.title]),
)

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      description: 'Drives which icon the frontend renders.',
      options: {list: [...SOCIAL_PLATFORMS]},
      validation: (Rule) => Rule.required().error('Pick a platform.'),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'Full link to the profile.',
      validation: (Rule) =>
        Rule.required().uri({scheme: ['http', 'https']}).error('Must be a full http(s) URL.'),
    }),
    defineField({
      name: 'label',
      title: 'Accessible label',
      type: 'string',
      description:
        'Screen-reader text (e.g. "Brigada on LinkedIn"). Optional — falls back to the platform name.',
    }),
  ],
  preview: {
    select: {platform: 'platform', url: 'url', label: 'label'},
    prepare({platform, url, label}) {
      return {
        title: label || PLATFORM_TITLES[platform as string] || 'Social link',
        subtitle: url || 'No URL yet',
      }
    },
  },
})
