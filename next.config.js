/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/dailyframe',
  async redirects() {
    return [
      {
        source: '/',
        destination: 'https://jawdroppuh.lol/dailyframe',
        permanent: false,
        basePath: false,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.vercel-storage.com' }
    ]
  }
};

module.exports = nextConfig;
