import {TranslateIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {orderRankField, orderRankOrdering} from '@sanity/orderable-document-list'
import {resolveI18nValue, slugField} from '../helpers'

export const translationNamespace = defineType({
  name: 'translationNamespace',
  title: 'Translations',
  type: 'document',
  icon: TranslateIcon,
  description:
    'Reusable website copy that is not part of a page or content document: form labels, error messages, button copy, footer text.',
  orderings: [orderRankOrdering],
  fields: [
    orderRankField({type: 'translationNamespace'}),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Display name for this namespace (e.g. "Form", "Footer").',
      validation: (Rule) => Rule.required().error('Give the namespace a title.'),
    }),
    slugField({docType: 'translationNamespace'}),
    defineField({
      name: 'keys',
      title: 'Translation keys',
      type: 'array',
      description:
        'Each key is one reusable UI string. Add the English and Dutch values inside the translation field.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'translationKey',
          title: 'Translation key',
          fields: [
            defineField({
              name: 'key',
              title: 'Key',
              type: 'string',
              description: 'Dot-notated identifier (e.g. "firstName", "errors.required").',
              validation: (Rule) => Rule.required().error('Every key needs an identifier.'),
            }),
            defineField({
              name: 'description',
              title: 'Description',
              type: 'string',
              description: 'Context for translators — where this string is shown and how.',
            }),
            defineField({
              name: 'translations',
              title: 'Translated text',
              type: 'internationalizedArrayString',
            }),
          ],
          preview: {
            select: {key: 'key', translations: 'translations'},
            prepare({
              key,
              translations,
            }: {
              key?: string
              translations?: {_key: string; value: string}[]
            }) {
              return {
                title: key || 'Untitled',
                subtitle: resolveI18nValue(translations, ''),
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'title', keys: 'keys'},
    prepare({title, keys}: {title?: string; keys?: unknown[]}) {
      return {
        title: title || 'Untitled',
        subtitle: `${keys?.length ?? 0} keys`,
      }
    },
  },
})
