/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const rawBackendUrl = process.env.BACKEND_PROXY_URL || 'http://localhost:3100/api';
    const cleanUrl = rawBackendUrl.replace(/\/(:path\*)?$/, '').replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${cleanUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
