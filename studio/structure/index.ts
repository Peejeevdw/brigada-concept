import {CogIcon, TranslateIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'
import {createDocumentsSection} from './documentsSection'
import {localePicker} from './helpers'
import {createPagesSection} from './pagesSection'

export const structure: StructureResolver = (S, context) => {
  const {currentUser} = context
  const isAdmin = currentUser?.roles.some((role) => role.name === 'administrator')

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

      ...(isAdmin
        ? [
            S.divider(),
            S.documentTypeListItem('locale').id('locale').title('Languages').icon(TranslateIcon),
          ]
        : []),
    ])
}
