/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['three'],
  async rewrites() {
    return [
      // Static portal — keeps the URL clean while serving public/universinid.html
      { source: '/universinid', destination: '/universinid.html' },
    ];
  },
};
export default nextConfig;
