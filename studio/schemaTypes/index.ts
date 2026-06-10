// Objects
import {blockContent} from './objects/blockContent'
import {blockContentTextOnly} from './objects/blockContentTextOnly'
import {socialLink} from './objects/socialLink'
import {seo} from './objects/seo'
import {link} from './objects/link'
import {submenuItem} from './objects/submenuItem'
import {caseMedia, caseHeroMedia} from './objects/caseMedia'
import {galleryRow} from './objects/galleryRow'

// Page builder blocks (case-story focused)
import {richText} from './objects/blocks/richText'
import {sectionImage} from './objects/blocks/sectionImage'
import {imageGrid} from './objects/blocks/imageGrid'
import {videoEmbed} from './objects/blocks/videoEmbed'
import {quote} from './objects/blocks/quote'
import {statBlock} from './objects/blocks/statBlock'

// Documents
import {locale} from './documents/locale'
import {serviceCategory} from './documents/serviceCategory'
import {job} from './documents/job'
import {person} from './documents/person'
import {work} from './documents/work'
import {location} from './documents/location'
import {menu} from './documents/menu'
import {legalPage} from './documents/legalPage'
import {landingPage} from './documents/landingPage'
import {pressRelease} from './documents/pressRelease'
import {formSubmission} from './documents/formSubmission'

// Singletons
import {homePage} from './singletons/homePage'
import {aboutPage} from './singletons/aboutPage'
import {careersPage} from './singletons/careersPage'
import {contactPage} from './singletons/contactPage'
import {privacyPage} from './singletons/privacyPage'
import {siteSettings} from './singletons/siteSettings'
import {workIndexPage} from './singletons/workIndexPage'
import {serviceCategoryIndexPage} from './singletons/serviceCategoryIndexPage'

export const schemaTypes = [
  // Objects
  blockContent,
  blockContentTextOnly,
  socialLink,
  seo,
  link,
  submenuItem,
  caseMedia,
  caseHeroMedia,
  galleryRow,

  // Page builder blocks
  richText,
  sectionImage,
  imageGrid,
  videoEmbed,
  quote,
  statBlock,

  // Documents
  locale,
  serviceCategory,
  job,
  person,
  work,
  location,
  menu,
  legalPage,
  landingPage,
  pressRelease,
  formSubmission,

  // Singletons
  homePage,
  aboutPage,
  careersPage,
  contactPage,
  privacyPage,
  siteSettings,
  workIndexPage,
  serviceCategoryIndexPage,
]
