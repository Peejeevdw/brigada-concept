/**
 * One-shot seed of the current hardcoded demo content into Sanity.
 *
 * Idempotent — every doc uses a deterministic `_id`, so re-running upserts
 * cleanly. Run with: `pnpm tsx scripts/seed.ts` from inside `studio/`.
 *
 * Requires SANITY_PROJECT_ID + SANITY_API_TOKEN in studio/.env (the token
 * needs write access to the dataset). Set SANITY_DATASET to override the
 * default `production` target.
 *
 * Phased: foundation → documents → singletons. Each phase can be run on its
 * own via CLI flags (--only=foundation|docs|singletons). Default runs all.
 */

import {createClient, type SanityClient} from '@sanity/client'
import {config as loadEnv} from 'dotenv'

loadEnv({path: new URL('../.env', import.meta.url).pathname})

const API_VERSION = '2026-04-08'
const DEFAULT_LOCALE = 'en'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

const client: SanityClient = createClient({
  projectId: required('SANITY_PROJECT_ID'),
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: API_VERSION,
  token: required('SANITY_API_TOKEN'),
  useCdn: false,
})

// ---------- helpers ----------

function i18nString(value: string, locale = DEFAULT_LOCALE) {
  return [{_key: locale, value}]
}

type AnyDoc = {_id: string; _type: string; [key: string]: unknown}

async function upsert<T extends AnyDoc>(doc: T): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await client.createOrReplace(doc as any)
  console.log(`  ✓ ${doc._id}`)
  return doc
}

// ---------- 1. Foundation: locations, people, site settings, menus, legal ----------

async function seedLocations() {
  console.log('Locations…')
  const items = [
    {
      _id: 'location.antwerp',
      city: 'Antwerp',
      street: 'Molenstraat',
      number: '54',
      postalCode: '2018',
      country: 'Belgium',
      phone: '+32 3 443 29 00',
    },
    {
      _id: 'location.ghent',
      city: 'Ghent',
      street: 'Amelia Earhartlaan',
      number: '2 Bus 401',
      postalCode: '9051',
      country: 'Belgium',
      phone: '+32 9 123 45 67',
    },
    {
      _id: 'location.brussels',
      city: 'Brussels',
      street: 'Waelhemstraat',
      number: '77',
      postalCode: '1030',
      country: 'Belgium',
      phone: '+32 2 427 24 14',
    },
  ]

  for (const item of items) {
    await upsert({
      _id: item._id,
      _type: 'location',
      title: i18nString(`Brigada ${item.city}`),
      street: i18nString(item.street),
      number: item.number,
      postalCode: item.postalCode,
      city: i18nString(item.city),
      country: i18nString(item.country),
      phone: item.phone,
    })
  }
}

async function seedPeople() {
  console.log('People (pillar leads + contact roster)…')
  const people = [
    // Pillar leads
    {
      _id: 'person.mathias-delmote',
      name: 'Mathias Delmote',
      position: 'Brand Lead',
      email: 'mathias@brigada.be',
      phone: '+00 000 00 00',
    },
    {
      _id: 'person.jeroen-debock',
      name: 'Jeroen De Bock',
      position: 'Client Partner',
      email: 'jeroen.debock@brigada.be',
      phone: '+32 477 62 76 01',
    },
    {
      _id: 'person.bartel-van-iseghem',
      name: 'Bartel Van Iseghem',
      position: 'People Lead',
      email: 'bartel@brigada.be',
      phone: '+00 000 00 00',
    },
    {
      _id: 'person.dennis-nicholls',
      name: 'Dennis Nicholls',
      position: 'Marketing Lead',
      email: 'dennis@brigada.be',
      phone: '+00 000 00 00',
    },
    // Management
    {
      _id: 'person.arjan-pomper',
      name: 'Arjan Pomper',
      position: 'Chief Executive Officer',
      email: 'ceo@brigada.be',
      phone: '+00 000 00 00',
    },
    {
      _id: 'person.evert-vermeire',
      name: 'Evert Vermeire',
      position: 'Chief Operating Officer',
      email: 'coo@brigada.be',
      phone: '+00 000 00 00',
    },
    {
      _id: 'person.joost-berends',
      name: 'Joost Berends',
      position: 'Chief Creative Officer',
      email: 'cco@brigada.be',
      phone: '+00 000 00 00',
    },
    {
      _id: 'person.senta-slingerland',
      name: 'Senta Slingerland',
      position: 'Chief Strategy Officer',
      email: 'cso@brigada.be',
      phone: '+00 000 00 00',
    },
  ]

  for (const p of people) {
    await upsert({_id: p._id, _type: 'person', ...p})
  }
}

async function seedSiteSettings() {
  console.log('Site settings…')
  await upsert({
    _id: 'siteSettings.en',
    _type: 'siteSettings',
    locale: DEFAULT_LOCALE,
    title: 'Brigada',
    tagline: 'We cut through the noise to set brands in motion across everything they do.',
    email: 'hello@brigada.be',
    phone: '+32 (0)000 00 00 00',
    socials: [
      {_key: 'instagram', _type: 'socialLink', platform: 'instagram', url: 'https://instagram.com/brigada', label: 'Instagram'},
      {_key: 'linkedin', _type: 'socialLink', platform: 'linkedin', url: 'https://linkedin.com/company/brigada', label: 'LinkedIn'},
      {_key: 'vimeo', _type: 'socialLink', platform: 'other', url: 'https://vimeo.com/brigada', label: 'Vimeo'},
    ],
    legalLinks: [
      {_key: 'privacy', _type: 'legalLink', label: 'Privacy', external: '/privacy'},
      {_key: 'cookies', _type: 'legalLink', label: 'Cookies', external: '/cookies'},
    ],
  })
}

async function seedMenus() {
  console.log('Menus (main + footer)…')

  await upsert({
    _id: 'menu.main',
    _type: 'menu',
    title: 'Main navigation',
    identifier: 'main',
    items: [
      {
        _key: 'expertise',
        _type: 'link',
        label: i18nString('Expertise'),
        target: 'internal',
        internal: {_type: 'reference', _ref: 'expertiseIndexPage.en'},
        openInNewTab: false,
        submenu: [
          {_key: 'brand', _type: 'submenuItem', label: i18nString('Brand'), target: 'external', url: '/brand'},
          {_key: 'product', _type: 'submenuItem', label: i18nString('Product'), target: 'external', url: '/product'},
          {_key: 'people', _type: 'submenuItem', label: i18nString('People'), target: 'external', url: '/people'},
          {_key: 'marketing', _type: 'submenuItem', label: i18nString('Marketing'), target: 'external', url: '/marketing'},
        ],
      },
      {_key: 'work', _type: 'link', label: i18nString('Work'), target: 'internal', internal: {_type: 'reference', _ref: 'workIndexPage.en'}},
      {_key: 'about', _type: 'link', label: i18nString('About'), target: 'internal', internal: {_type: 'reference', _ref: 'aboutPage.en'}},
      {_key: 'careers', _type: 'link', label: i18nString('Careers'), target: 'internal', internal: {_type: 'reference', _ref: 'careersPage.en'}},
      {_key: 'contact', _type: 'link', label: i18nString('Contact'), target: 'internal', internal: {_type: 'reference', _ref: 'contactPage.en'}},
    ],
  })

  await upsert({
    _id: 'menu.footer',
    _type: 'menu',
    title: 'Footer pages',
    identifier: 'footer',
    items: [
      {_key: 'home', _type: 'link', label: i18nString('Home'), target: 'internal', internal: {_type: 'reference', _ref: 'homePage.en'}},
      {_key: 'expertise', _type: 'link', label: i18nString('Expertise'), target: 'internal', internal: {_type: 'reference', _ref: 'expertiseIndexPage.en'}},
      {_key: 'work', _type: 'link', label: i18nString('Work'), target: 'internal', internal: {_type: 'reference', _ref: 'workIndexPage.en'}},
      {_key: 'about', _type: 'link', label: i18nString('About'), target: 'internal', internal: {_type: 'reference', _ref: 'aboutPage.en'}},
      {_key: 'careers', _type: 'link', label: i18nString('Careers'), target: 'internal', internal: {_type: 'reference', _ref: 'careersPage.en'}},
      {_key: 'contact', _type: 'link', label: i18nString('Contact'), target: 'internal', internal: {_type: 'reference', _ref: 'contactPage.en'}},
    ],
  })
}

async function seedLegal() {
  console.log('Legal pages (privacy + cookies)…')
  const KINDS = [
    {
      kind: 'privacy',
      title: 'Privacy policy',
      body: [
        'Placeholder privacy policy. Replace with your real legal copy in the Studio.',
        'You can structure this with headings, lists and links via the rich-text editor.',
      ],
    },
    {
      kind: 'cookies',
      title: 'Cookie policy',
      body: [
        'Placeholder cookie policy. Replace with your real legal copy in the Studio.',
        'Describe what cookies you use and how visitors can manage them.',
      ],
    },
  ]

  for (const entry of KINDS) {
    await upsert({
      _id: `legalPage.${entry.kind}.en`,
      _type: 'legalPage',
      locale: DEFAULT_LOCALE,
      kind: entry.kind,
      title: entry.title,
      body: entry.body.map((text, i) => ({
        _key: `p${i}`,
        _type: 'block',
        style: 'normal',
        children: [{_key: `s${i}`, _type: 'span', text, marks: []}],
        markDefs: [],
      })),
    })
  }
}

// ---------- 2. Documents: expertise + work + jobs ----------

async function seedExpertise() {
  console.log('Expertise (4 pillars)…')

  // Mirrors src/data/pillars.ts (trimmed for brevity — fill out per-pillar
  // services list with real copy via Studio after the initial seed).
  const pillars = [
    {
      slug: 'brand',
      name: 'Brand',
      lead: 'person.mathias-delmote',
      brio: 'brio-06',
      order: 10,
      eyebrow: 'How we move your',
      tagline: 'the source of movement',
      intro:
        'We craft brands. We give them purpose and personality, and we make them look, sound and feel like they’ve got a pulse.',
      servicesIntro:
        'From the first strategic decision to the last asset shipped, our brand services cover positioning, identity, voice and the systems that hold it all together.',
      services: [
        {title: 'Brand strategy & platforms', description: 'is where we define what your brand stands for, who it’s for and the platforms that hold every decision together.'},
        {title: 'Naming, verbal & sonic identity', description: 'is the language and sound of your brand, from names that stick to a voice and audio signature unlike anyone else.'},
        {title: 'Brand identity concept & design', description: 'is the visual world of your brand: logo, typography, colour, imagery and the rules that make them work as one.'},
        {title: 'Motion to spatial identity design', description: 'is the brand expressed in time and space, from animated logos to environments people walk through.'},
        {title: 'Brand implementation & management', description: 'covers rollout, design systems, tooling and the brand portal that keep work on-brand at scale.'},
      ],
    },
    {
      slug: 'product',
      name: 'Product',
      lead: 'person.jeroen-debock',
      brio: 'brio-03',
      order: 20,
      eyebrow: 'How we move your',
      tagline: 'where brand meets behaviour',
      intro:
        'We design and build digital products people actually want to use — websites, apps, platforms, tools — and ship them fast.',
      servicesIntro: 'Strategy, UX, design systems and full-stack engineering, end to end.',
      services: [
        {title: 'Product strategy & service design', description: ''},
        {title: 'UX research & design', description: ''},
        {title: 'Design systems & component libraries', description: ''},
        {title: 'Front-end & full-stack development', description: ''},
        {title: 'Platform integrations & CMS', description: ''},
      ],
    },
    {
      slug: 'people',
      name: 'People',
      lead: 'person.bartel-van-iseghem',
      brio: 'brio-02',
      order: 30,
      eyebrow: 'How we move your',
      tagline: 'culture is the strategy',
      intro:
        'We turn organisational culture into a force you can market: from employer branding to internal launches and leadership comms.',
      servicesIntro: 'Inside-out work that makes the people in the building proud to be there.',
      services: [
        {title: 'Employer branding', description: ''},
        {title: 'Internal launches & comms', description: ''},
        {title: 'Recruitment campaigns', description: ''},
        {title: 'Leadership & change comms', description: ''},
        {title: 'Workplace experience', description: ''},
      ],
    },
    {
      slug: 'marketing',
      name: 'Marketing',
      lead: 'person.dennis-nicholls',
      brio: 'brio-04',
      order: 40,
      eyebrow: 'How we move your',
      tagline: 'campaigns that move',
      intro:
        'We turn strategy into campaigns that cut through. Big ideas, sharp craft, and the platforms to roll them out everywhere they need to land.',
      servicesIntro: 'From the platform idea to the last 6-second cut.',
      services: [
        {title: 'Creative platforms & campaigning', description: ''},
        {title: 'Content & social', description: ''},
        {title: 'Media & paid strategy', description: ''},
        {title: 'Performance creative', description: ''},
        {title: 'Production & post', description: ''},
      ],
    },
  ]

  for (const p of pillars) {
    await upsert({
      _id: `expertise.${p.slug}.en`,
      _type: 'expertise',
      locale: DEFAULT_LOCALE,
      name: p.name,
      slug: {_type: 'slug', current: p.slug},
      eyebrow: p.eyebrow,
      tagline: p.tagline,
      intro: p.intro,
      servicesIntro: p.servicesIntro,
      services: p.services.map((s, i) => ({_key: `s${i}`, ...s})),
      lead: {_type: 'reference', _ref: p.lead},
      leadIn: '{name} is the person to talk to.',
      brioPaletteId: p.brio,
      order: p.order,
      cases: {mode: 'recent', limit: 6, title: 'Recent cases'},
    })
  }
}

async function seedWork() {
  console.log('Work cases (BMW + Agristo)…')

  await upsert({
    _id: 'work.bmw.en',
    _type: 'work',
    locale: DEFAULT_LOCALE,
    name: 'A new chapter for the ultimate driving machine',
    slug: {_type: 'slug', current: 'bmw'},
    client: 'BMW',
    year: 2025,
    code: 'BRGD.001',
    featured: true,
    intro: 'Rebrand, naming strategy, design system and digital platform.',
    expertises: [
      {_key: 'brand', _type: 'reference', _ref: 'expertise.brand.en'},
      {_key: 'product', _type: 'reference', _ref: 'expertise.product.en'},
      {_key: 'marketing', _type: 'reference', _ref: 'expertise.marketing.en'},
    ],
    brief: paragraphsToBlocks([
      'BMW asked us to reframe what the ultimate driving machine stands for in an era where the category is being redefined by electrification, software and shifting cultural codes.',
      'We rebuilt the brand expression from the inside out: a sharper positioning, a fresh visual and verbal identity, a naming framework for the model portfolio, and a digital platform that puts the new BMW into drivers\' hands every day.',
    ]),
    approach: paragraphsToBlocks([
      'We treated the rebrand as a system, not a skin. Strategy, identity, naming and product worked in lockstep, so every decision reinforced the next instead of pulling in different directions.',
      'The result is a brand that scales: a flexible visual language, a clear verbal toolkit, and a product architecture that lets teams ship new offers without reinventing the wheel each time.',
    ]),
    context: paragraphsToBlocks([
      'The premium automotive category had drifted into a sea of sameness: identical silhouettes, identical promises, identical tones. Drivers stopped listening, and brands stopped standing for anything beyond their badge. Our work started with a simple question: what does BMW actually believe in today?',
    ]),
    outcome: paragraphsToBlocks([
      'The new BMW shows up sharper across every touchpoint: a positioning the organisation can rally behind, an identity that cuts through a flat category, and a model portfolio that finally speaks one language.',
      'Internally, teams move faster because the brand decisions have already been made; externally, drivers recognise BMW before they read the logo.',
    ]),
  })

  await upsert({
    _id: 'work.agristo.en',
    _type: 'work',
    locale: DEFAULT_LOCALE,
    name: 'A potato-loving brand with bite',
    slug: {_type: 'slug', current: 'agristo'},
    client: 'Agristo',
    year: 2024,
    code: 'BRGD.002',
    intro:
      'Brand world, employer platform and digital concepts for a family-run potato company.',
    expertises: [
      {_key: 'brand', _type: 'reference', _ref: 'expertise.brand.en'},
      {_key: 'product', _type: 'reference', _ref: 'expertise.product.en'},
      {_key: 'marketing', _type: 'reference', _ref: 'expertise.marketing.en'},
    ],
    brief: paragraphsToBlocks([
      'Agristo is a family-run Belgian potato company that supplies frozen products to retail and foodservice clients across the world. They asked us to translate their down-to-earth, hands-on culture into a brand world that could compete with much larger global players.',
      'The work spans a refreshed identity, a new digital platform, an employer branding campaign and a recipe & potato concepts experience that brings the product to life for chefs and consumers alike.',
    ]),
    approach: paragraphsToBlocks([
      'We leaned into what makes Agristo different: a tight-knit team, a love for the craft, and a sense of humour that is rare in B2B food. The verbal identity is warm and a little cheeky; the visual system is bright, generous and unmistakably yellow.',
      'On the product side we built a flexible CMS-driven platform so the marketing and HR teams can publish recipes, potato concepts and jobs at speed, without ever feeling like a corporate site.',
    ]),
    context: paragraphsToBlocks([
      'Frozen potatoes are a commodity category dominated by industrial players talking about scale and efficiency. Agristo wanted to compete on personality and craft instead. We worked with their team in Harelbeke for nearly a year, sitting in on production tours, tasting sessions and recruitment days, so the brand we shipped felt like the company we met.',
    ]),
    outcome: paragraphsToBlocks([
      'The new Agristo brand is showing up everywhere: from the recipe site that now drives qualified leads from chefs, to the Vetste Jobs employer campaign that hit record application numbers in its first quarter.',
      'Internally, the team finally has a brand they recognise as their own: confident, playful, and proud of the potato.',
    ]),
  })
}

// ---------- 3. Singletons (home, about, careers, contact, indexes) ----------

async function seedIndexPages() {
  console.log('Index singletons (work + expertise)…')
  await upsert({
    _id: 'workIndexPage.en',
    _type: 'workIndexPage',
    locale: DEFAULT_LOCALE,
    title: 'Work index',
    hero: {
      eyebrow: 'Meet the clients',
      title:
        'A handful of the brands and teams we get to move with. Each one a different mix of strategy, brand, product and campaigns.',
    },
  })

  await upsert({
    _id: 'expertiseIndexPage.en',
    _type: 'expertiseIndexPage',
    locale: DEFAULT_LOCALE,
    title: 'Expertise index',
    hero: {
      eyebrow: 'Our services',
      title:
        'Most agencies tell you their craft is their secret sauce. Ours? We see the bigger picture and connect the dots so brand, product, people and marketing all move together.',
    },
    pillars: [
      {_key: 'brand', _type: 'reference', _ref: 'expertise.brand.en'},
      {_key: 'product', _type: 'reference', _ref: 'expertise.product.en'},
      {_key: 'people', _type: 'reference', _ref: 'expertise.people.en'},
      {_key: 'marketing', _type: 'reference', _ref: 'expertise.marketing.en'},
    ],
  })
}

async function seedHomePage() {
  console.log('Home page…')
  await upsert({
    _id: 'homePage.en',
    _type: 'homePage',
    locale: DEFAULT_LOCALE,
    title: 'Home page',
    intro: {
      eyebrow: 'Brigada is a',
      taglines: ['Sharp', 'Beats', 'Loud'],
      paragraph:
        'We cut through the noise to set brands in motion across everything they do.',
    },
    reel: {
      hlsUrl:
        'https://vz-329506f6-bc3.b-cdn.net/a62cb18e-7507-4aba-ba4d-35ffcf06c530/playlist.m3u8',
    },
    cases: {
      title: 'Latest cases',
      items: [
        {
          _key: 'tui',
          work: {_type: 'reference', _ref: 'work.bmw.en'},
          backgroundType: 'color',
          bgColor: '#FFC21E',
          fgColor: '#2D2928',
        },
        {
          _key: 'meetmarcel',
          work: {_type: 'reference', _ref: 'work.agristo.en'},
          backgroundType: 'color',
          bgColor: '#1A232E',
          fgColor: '#FFFFFF',
        },
      ],
    },
    awards: {
      eyebrow: 'Proud not loud',
      title: 'Awards',
      description: 'A selection of recent recognition.',
      items: [
        {_key: 'a1', year: '2026', organization: 'Cannes Lions', title: 'Gold, Film Craft, for Volvo'},
        {_key: 'a2', year: '2026', organization: 'Cannes Lions', title: 'Gold, Film Craft, for Volvo'},
        {_key: 'a3', year: '2026', organization: 'Cannes Lions', title: 'Gold, Film Craft, for Volvo'},
        {_key: 'a4', year: '2026', organization: 'Cannes Lions', title: 'Gold, Film Craft, for Volvo'},
        {_key: 'a5', year: '2026', organization: 'Cannes Lions', title: 'Gold, Film Craft, for Volvo'},
      ],
    },
  })
}

async function seedAboutPage() {
  console.log('About page…')
  await upsert({
    _id: 'aboutPage.en',
    _type: 'aboutPage',
    locale: DEFAULT_LOCALE,
    title: 'About page',
    hero: {words: ['SHARP', 'BEATS', 'LOUD']},
    narrative: paragraphsToBlocks([
      'Brigada was born when six independent agencies joined forces to build a sharper, faster, more useful kind of partner. We combine strategy, brand, product, people and marketing under one roof so the work moves as one.',
    ]),
    sections: [
      {
        _key: 'fight',
        label: 'The fight we picked',
        layout: 'text',
        body: paragraphsToBlocks([
          'We picked a fight with the agency status quo: siloed teams, slow decisions and work that solves yesterday\'s problem. Brigada is built to move quicker than that.',
        ]),
      },
      {
        _key: 'heritage',
        label: 'Strong heritage',
        layout: 'text',
        body: paragraphsToBlocks([
          'The legacy agencies behind Brigada won Effies, Cannes Lions and CCBs across two decades. We carry that craft into a single new shop.',
        ]),
      },
      {
        _key: 'tools',
        label: 'The sharpest tools in the shed',
        layout: 'text',
        body: paragraphsToBlocks([
          'We work to the SHARP model — Strategic, Human, Authentic, Relevant, Provocative. Every brief gets the same hard test before it ships.',
          'It keeps us honest. It keeps the work honest.',
        ]),
      },
      {
        _key: 'future',
        label: 'An agency for the future',
        layout: 'text',
        body: paragraphsToBlocks([
          'Strategy and craft are non-negotiable. Speed, integrated teams and tooling are the multipliers. Brigada is built for the second half of this decade, not the last one.',
        ]),
      },
    ],
  })
}

async function seedCareersPage() {
  console.log('Careers page…')
  await upsert({
    _id: 'careersPage.en',
    _type: 'careersPage',
    locale: DEFAULT_LOCALE,
    title: 'Careers page',
    hero: {
      eyebrow: 'Baby make your move',
      title:
        'We think for ourselves. We pick fights worth having. We back each other. If that sounds like your kind of place, find your seat below.',
      brioPaletteId: 'brio-03',
    },
    vacancies: {
      title: 'Open positions',
      intro:
        'Drop us a line if you don\'t see your role — we\'re always open to sharp people.',
      mode: 'all',
      emptyMessage: 'Nothing fits right now? Send us a line anyway.',
    },
  })
}

async function seedContactPage() {
  console.log('Contact page…')
  await upsert({
    _id: 'contactPage.en',
    _type: 'contactPage',
    locale: DEFAULT_LOCALE,
    title: 'Contact page',
    hero: {
      eyebrow: 'Get in touch',
      title:
        'Fill out the form or email us, and we\'ll get back to you within two working days. You can also call us, or swing by one of our offices.',
      brioPaletteId: 'brio-05',
    },
    form: {
      intro: 'Hi there',
      submitLabel: 'Send',
      fields: [
        {_key: 'name', name: 'name', label: 'Name', type: 'text', required: true, span: 'half'},
        {_key: 'company', name: 'company', label: 'Company', type: 'text', span: 'half'},
        {_key: 'email', name: 'email', label: 'Email', type: 'email', required: true, span: 'half'},
        {_key: 'phone', name: 'phone', label: 'Phone', type: 'tel', span: 'half'},
        {_key: 'project', name: 'project', label: 'Project', type: 'text', span: 'full'},
        {_key: 'message', name: 'message', label: 'Message', type: 'textarea', span: 'full'},
      ],
    },
    expertiseContacts: [
      {_key: 'brand', label: 'Brand', expertise: {_type: 'reference', _ref: 'expertise.brand.en'}, person: {_type: 'reference', _ref: 'person.mathias-delmote'}},
      {_key: 'product', label: 'Product', expertise: {_type: 'reference', _ref: 'expertise.product.en'}, person: {_type: 'reference', _ref: 'person.jeroen-debock'}},
      {_key: 'people', label: 'People', expertise: {_type: 'reference', _ref: 'expertise.people.en'}, person: {_type: 'reference', _ref: 'person.bartel-van-iseghem'}},
      {_key: 'marketing', label: 'Marketing', expertise: {_type: 'reference', _ref: 'expertise.marketing.en'}, person: {_type: 'reference', _ref: 'person.dennis-nicholls'}},
      {_key: 'newbizz', label: 'New bizz', person: {_type: 'reference', _ref: 'person.evert-vermeire'}},
    ],
    locations: {mode: 'all'},
  })
}

// ---------- portable-text helper ----------

function paragraphsToBlocks(paragraphs: string[]) {
  return paragraphs.map((text, i) => ({
    _key: `p${i}`,
    _type: 'block',
    style: 'normal',
    children: [{_key: `s${i}`, _type: 'span', text, marks: []}],
    markDefs: [],
  }))
}

// ---------- runner ----------

async function main() {
  const only = (process.argv.find((a) => a.startsWith('--only='))?.split('=')[1] ?? '').toLowerCase()
  const phases = only ? new Set(only.split(',')) : new Set(['foundation', 'docs', 'singletons'])

  if (phases.has('foundation')) {
    await seedLocations()
    await seedPeople()
    await seedSiteSettings()
    await seedLegal()
  }
  if (phases.has('docs')) {
    await seedExpertise()
    await seedWork()
  }
  if (phases.has('singletons')) {
    await seedIndexPages()
    await seedHomePage()
    await seedAboutPage()
    await seedCareersPage()
    await seedContactPage()
    // Menus reference the singletons, so run them last.
    await seedMenus()
  }

  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
