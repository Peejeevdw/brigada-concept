import {CogIcon, DocumentIcon, DocumentTextIcon, EnvelopeIcon, UserIcon} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {SubmissionSummary} from '../components/SubmissionSummary'
import {createDocumentsSection} from './documentsSection'
import {localePicker} from './helpers'
import {createPagesSection} from './pagesSection'

/**
 * Form submissions are archive entries — viewing only. The default form
 * renders every read-only field as a heavy input box; this child builder
 * replaces it with a typographic summary view so editors get a clean
 * read instead of a stack of greyed-out inputs. Sanity still validates
 * against the schema in the background.
 */
function submissionChild(S: StructureBuilder) {
  return (documentId: string) =>
    S.document()
      .documentId(documentId)
      .schemaType('formSubmission')
      .views([S.view.component(SubmissionSummary).title('Summary')])
}

/**
 * Desk structure. The "Languages" admin section is hidden while the site is
 * English-only — `locale` documents stay in the schema but aren't surfaced
 * in the desk. Restore the bottom item to bring it back when re-enabling
 * a second language.
 */
export const structure: StructureResolver = (S) => {
  return S.list()
    .title('Content')
    .items([
      ...createPagesSection(S),

      S.divider(),

      ...createDocumentsSection(S),

      S.divider(),

      S.listItem()
        .id('landingPages')
        .title('Landing pages')
        .icon(DocumentIcon)
        .child(
          S.documentTypeList('landingPage')
            .title('Landing pages')
            .defaultOrdering([{field: 'slug.current', direction: 'asc'}]),
        ),

      S.listItem()
        .id('pressReleases')
        .title('Press releases')
        .icon(DocumentTextIcon)
        .child(
          S.documentTypeList('pressRelease')
            .title('Press releases')
            .defaultOrdering([{field: 'publishDate', direction: 'desc'}]),
        ),

      S.divider(),

      S.listItem()
        .id('contactSubmissions')
        .title('Contact submissions')
        .icon(EnvelopeIcon)
        .child(
          S.documentTypeList('formSubmission')
            .title('Contact submissions')
            .filter('_type == "formSubmission" && kind == "contact"')
            .defaultOrdering([{field: 'submittedAt', direction: 'desc'}])
            .child(submissionChild(S)),
        ),
      S.listItem()
        .id('jobApplications')
        .title('Job applications')
        .icon(UserIcon)
        .child(
          S.documentTypeList('formSubmission')
            .title('Job applications')
            .filter('_type == "formSubmission" && kind == "job-application"')
            .defaultOrdering([{field: 'submittedAt', direction: 'desc'}])
            .child(submissionChild(S)),
        ),

      S.divider(),

      S.listItem()
        .id('siteSettings')
        .title('Site settings')
        .icon(CogIcon)
        .child(localePicker(S, 'siteSettings')),
    ])
}
