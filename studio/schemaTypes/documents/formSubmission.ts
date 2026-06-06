import {EnvelopeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Form submission backup. Created by the website's API routes (contact +
 * job-apply) and never edited from the Studio — see the actions filter in
 * `sanity.config.ts` which strips publish/edit/delete for this doctype.
 *
 * The shape is deliberately generic: a `kind` discriminator + a flat
 * `entries` array of `{name, label, value}` records. That way new form
 * fields don't need a schema change here every time editors add or
 * rename a field on the source form.
 */
export const formSubmission = defineType({
  name: 'formSubmission',
  title: 'Form submission',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        list: [
          {title: 'Contact', value: 'contact'},
          {title: 'Job application', value: 'job-application'},
        ],
      },
      validation: (Rule) => Rule.required(),
      readOnly: true,
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted at',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
      readOnly: true,
    }),
    defineField({
      name: 'job',
      title: 'Job',
      type: 'reference',
      to: [{type: 'job'}],
      description: 'Set for job applications, empty for contact submissions.',
      readOnly: true,
      weak: true,
    }),
    defineField({
      name: 'entries',
      title: 'Form data',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'object',
          name: 'submissionEntry',
          fields: [
            defineField({name: 'name', title: 'Field name', type: 'string', readOnly: true}),
            defineField({name: 'label', title: 'Label', type: 'string', readOnly: true}),
            defineField({name: 'value', title: 'Value', type: 'text', rows: 3, readOnly: true}),
          ],
          preview: {
            select: {label: 'label', name: 'name', value: 'value'},
            prepare({label, name, value}) {
              const v = typeof value === 'string' ? value : ''
              const truncated = v.length > 80 ? `${v.slice(0, 80)}…` : v
              return {title: label || name || 'Field', subtitle: truncated}
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'attachments',
      title: 'Attachments',
      type: 'array',
      readOnly: true,
      of: [
        defineArrayMember({
          type: 'file',
          name: 'submissionFile',
          options: {storeOriginalFilename: true},
        }),
      ],
    }),
    defineField({
      name: 'meta',
      title: 'Metadata',
      type: 'object',
      readOnly: true,
      fields: [
        defineField({name: 'ip', title: 'IP', type: 'string', readOnly: true}),
        defineField({name: 'userAgent', title: 'User agent', type: 'string', readOnly: true}),
        defineField({name: 'referer', title: 'Referer', type: 'string', readOnly: true}),
        defineField({name: 'turnstileVerdict', title: 'Turnstile verdict', type: 'string', readOnly: true}),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'submittedAtDesc',
      by: [{field: 'submittedAt', direction: 'desc'}],
    },
  ],
  preview: {
    select: {kind: 'kind', submittedAt: 'submittedAt', entries: 'entries', jobName: 'job.name'},
    prepare({kind, submittedAt, entries, jobName}) {
      const items = (entries as Array<{name?: string; value?: string}> | undefined) ?? []
      const findEntry = (needle: string) =>
        items.find((e) => (e.name ?? '').toLowerCase().includes(needle))?.value
      const name = findEntry('name')
      const email = findEntry('email')
      const senderLabel = [name, email].filter(Boolean).join(' · ') || '(no sender)'
      const when = submittedAt ? new Date(submittedAt).toLocaleString('nl-BE') : ''
      const kindLabel =
        kind === 'job-application' ? `Application${jobName ? ` · ${jobName}` : ''}` : 'Contact'
      return {title: senderLabel, subtitle: `${kindLabel} · ${when}`}
    },
  },
})
