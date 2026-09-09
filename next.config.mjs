/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  serverExternalPackages: ['postgres', 'pdfkit'],
};

export default nextConfig;
