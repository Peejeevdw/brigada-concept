/**
 * Sanity CLI Configuration
 * https://www.sanity.io/docs/cli
 */
import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? ''
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'

export default defineCliConfig({
  api: {projectId, dataset},
  deployment: {
    appId: 'zy1dau2dxfz3suwb6zcgai01',
    /**
     * Auto-update studios to the latest stable release of `sanity`.
     * https://www.sanity.io/docs/studio/latest-version-of-sanity
     */
    autoUpdates: true,
  },
})
