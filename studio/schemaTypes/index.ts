// Objects
import {blockContent} from './objects/blockContent'
import {blockContentTextOnly} from './objects/blockContentTextOnly'
import {linkItem} from './objects/linkItem'
import {menuItem} from './objects/menuItem'
import {legalLink} from './objects/legalLink'
import {socialLink} from './objects/socialLink'
import {seo} from './objects/seo'
import {link} from './objects/link'
import {submenuItem} from './objects/submenuItem'

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
import {legalPage} from './documents/legalPage'

// Singletons
import {homePage} from './singletons/homePage'
import {aboutPage} from './singletons/aboutPage'
import {careersPage} from './singletons/careersPage'
import {contactPage} from './singletons/contactPage'
import {privacyPage} from './singletons/privacyPage'
import {siteSettings} from './singletons/siteSettings'
import {workIndexPage} from './singletons/workIndexPage'
import {expertiseIndexPage} from './singletons/expertiseIndexPage'

export const schemaTypes = [
  // Objects
  blockContent,
  blockContentTextOnly,
  linkItem,
  menuItem,
  legalLink,
  socialLink,
  seo,
  link,
  submenuItem,

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
  legalPage,

  // Singletons
  homePage,
  aboutPage,
  careersPage,
  contactPage,
  privacyPage,
  siteSettings,
  workIndexPage,
  expertiseIndexPage,
]
