import {TranslateIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {i18nTitlePreview} from '../helpers'

export const locale = defineType({
  name: 'locale',
  title: 'Language',
  type: 'document',
  icon: TranslateIcon,
  description: 'A language the site supports. Drag to reorder; the first language is the default.',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'locale'}),
    defineField({
      name: 'title',
      title: 'Language name',
      type: 'internationalizedArrayString',
      description: 'The locale’s name, translated into every supported language.',
      validation: (Rule) => Rule.required().error('Give the locale a title.'),
    }),
    defineField({
      name: 'localeId',
      title: 'Language code',
      type: 'string',
      description: 'IANA tag (e.g. "en", "nl", "fr", "en-GB").',
      validation: (Rule) =>
        Rule.required()
          .regex(
            /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?(?:-[a-zA-Z0-9]{5,8}|-[0-9][a-zA-Z0-9]{3})*$/,
            {name: 'IANA language tag', invert: false},
          )
          .error('Must be a valid IANA language tag (e.g. en, en-US, zh-Hant-TW).'),
    }),
  ],
  preview: i18nTitlePreview({extraSelect: {localeId: 'localeId'}, subtitleField: 'localeId'}),
})
