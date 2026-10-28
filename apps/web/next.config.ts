import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'
import { SECURITY_HEADERS } from './src/lib/security-headers'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // shared code of Satu Sekolah Web & App (TypeScript source)
  transpilePackages: ['@satusekolah/core'],
  // development only: open the site on a school's host name mapped to this machine (multi-school testing)
  allowedDevOrigins: (process.env.DEV_HOSTS || 'www.smpkps.sch.id,localhost,127.0.0.1').split(',').map((h) => h.trim()),
  outputFileTracingRoot: path.resolve(dirname, '../..'),
  // the admin-only /setup/isi-data route reads the official photos & articles from content/
  outputFileTracingIncludes: {
    '/setup/isi-data': ['./content/**/*'],
  },
  // CSP (frames, objects, base URI, form targets), HSTS, nosniff, referrer and permissions: src/lib/security-headers.ts
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    // monorepo root (workspaces): node_modules are hoisted there
    root: path.resolve(dirname, '../..'),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
