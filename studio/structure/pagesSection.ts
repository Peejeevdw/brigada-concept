import type {ComponentType} from 'react'
import type {StructureBuilder} from 'sanity/structure'
import {EnvelopeIcon, HomeIcon, InfoOutlineIcon, LockIcon, UsersIcon} from '@sanity/icons'
import {localePicker} from './helpers'
import type {PageSingleton} from './constants'

const PAGE_ITEMS: ReadonlyArray<{
  schemaType: PageSingleton
  title: string
  icon: ComponentType
}> = [
  {schemaType: 'homePage', title: 'Home Page', icon: HomeIcon},
  {schemaType: 'aboutPage', title: 'About Page', icon: InfoOutlineIcon},
  {schemaType: 'careersPage', title: 'Careers Page', icon: UsersIcon},
  {schemaType: 'contactPage', title: 'Contact Page', icon: EnvelopeIcon},
  {schemaType: 'privacyPage', title: 'Privacy Page', icon: LockIcon},
]

export function createPagesSection(S: StructureBuilder) {
  return PAGE_ITEMS.map(({schemaType, title, icon}) =>
    S.listItem().id(schemaType).title(title).icon(icon).child(localePicker(S, schemaType)),
  )
}
