import {CogIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'
import {createDocumentsSection} from './documentsSection'
import {localePicker} from './helpers'
import {createPagesSection} from './pagesSection'

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
        .id('siteSettings')
        .title('Site settings')
        .icon(CogIcon)
        .child(localePicker(S, 'siteSettings')),
    ])
}
