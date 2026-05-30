// Objects
import {blockContent} from './objects/blockContent'
import {blockContentTextOnly} from './objects/blockContentTextOnly'
import {linkItem} from './objects/linkItem'
import {menuItem} from './objects/menuItem'
import {legalLink} from './objects/legalLink'
import {socialLink} from './objects/socialLink'

// Page builder blocks
import {hero} from './objects/blocks/hero'
import {textblock} from './objects/blocks/textblock'
import {selectedWork} from './objects/blocks/selectedWork'

// Documents
import {locale} from './documents/locale'
import {translationNamespace} from './documents/translationNamespace'
import {expertise} from './documents/expertise'
import {job} from './documents/job'
import {person} from './documents/person'
import {work} from './documents/work'
import {location} from './documents/location'
import {menu} from './documents/menu'

// Singletons
import {homePage} from './singletons/homePage'
import {aboutPage} from './singletons/aboutPage'
import {careersPage} from './singletons/careersPage'
import {contactPage} from './singletons/contactPage'
import {privacyPage} from './singletons/privacyPage'
import {siteSettings} from './singletons/siteSettings'

export const schemaTypes = [
  // Objects
  blockContent,
  blockContentTextOnly,
  linkItem,
  menuItem,
  legalLink,
  socialLink,

  // Page builder blocks
  hero,
  textblock,
  selectedWork,

  // Documents
  locale,
  translationNamespace,
  expertise,
  job,
  person,
  work,
  location,
  menu,

  // Singletons
  homePage,
  aboutPage,
  careersPage,
  contactPage,
  privacyPage,
  siteSettings,
]
