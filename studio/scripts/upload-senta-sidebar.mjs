// Uploads the Senta sidebar photo to Sanity and sets it on the press release's
// sidebarImage field, so it's served from the Sanity CDN (not a brigada.be
// static asset, which sits behind Cloudflare Access / has been flaky).
//
//   cd studio && npx sanity exec scripts/upload-senta-sidebar.mjs --with-user-token

import {readFileSync} from 'node:fs'
import {getCliClient} from 'sanity/cli'

const client = getCliClient()
const DOC_ID = 'pressRelease-launch'
const PATH = '/Users/onlyhumans/Documents/Brigagda-claude/public/Senta_Slingerland.jpg'

console.log('Uploading Senta photo…')
const asset = await client.assets.upload('image', readFileSync(PATH), {
  filename: 'senta-slingerland.jpg',
})
console.log('  asset:', asset._id, '\n  url:', asset.url)

await client
  .patch(DOC_ID)
  .set({
    sidebarImage: {
      _type: 'image',
      alt: 'Senta Slingerland, Chief Strategy Officer of Brigada',
      asset: {_type: 'reference', _ref: asset._id},
    },
  })
  .commit()
console.log('done — sidebarImage set on pressRelease-launch.')
