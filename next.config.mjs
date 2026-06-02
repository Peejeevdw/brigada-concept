/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // TODO: re-enable strict typecheck + lint after the React 19 / Next 16
  // ref-callback and unused-import cleanup pass.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
      { protocol: "https", hostname: "vz-329506f6-bc3.b-cdn.net" },
      { protocol: "https", hostname: "pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev" },
    ],
  },
};

export default nextConfig;
