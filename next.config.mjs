/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async rewrites() {
    const rawBackendUrl = process.env.BACKEND_PROXY_URL || 'http://localhost:3100/api';
    let cleanUrl = rawBackendUrl.replace(/\/(:path\*)?$/, '').replace(/\/$/, '');
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = `${cleanUrl}/api`;
    }
    return [
      {
        source: '/api/:path*',
        destination: `${cleanUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
