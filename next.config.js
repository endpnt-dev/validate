/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Enable Node.js runtime for API routes that need DNS/TLS
  runtime: 'nodejs',
  // Optimize for serverless deployment on Vercel
  output: 'standalone'
}

module.exports = nextConfig