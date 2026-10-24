

import { dirname } from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

const rootDir = dirname(fileURLToPath(import.meta.url));

const isPresentation = (process.env.PRESENTATION_MODE === 'true' || process.env.NEXT_PUBLIC_PRESENTATION_MODE === 'true') ? 'true' : 'false';

// React (and Turbopack/webpack HMR) require eval() in development for:
// - Error overlay call-stack reconstruction
// - Hot module replacement
// - Various debugging features
// Production mode never uses eval(), so we keep a strict CSP there.
const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_PRESENTATION_MODE: isPresentation,
    PRESENTATION_MODE: isPresentation,
  },
  // Required for Docker standalone builds (Dockerfile copies from .next/standalone)
  output: 'standalone',
  devIndicators: false,
  turbopack: {
    root: rootDir,
  },
  images: {
    // Serve optimized images in modern formats
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 30 days
    minimumCacheTTL: 2592000,
    // Device breakpoints for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        // MinIO local development
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        // MinIO — match any port on localhost/IP (dev & prod)
        protocol: 'http',
        hostname: '*.localhost',
      },
      {
        // Production MinIO / S3-compatible storage
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        // Production MinIO custom domain
        protocol: 'https',
        hostname: '*.vaididea.in',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/diagnosis',
        destination: '/diagnostic-center',
      },
      {
        source: '/diagnosis/:path*',
        destination: '/diagnostic-center/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            // CSP: restrict resource loading to known trusted origins.
            // 'unsafe-inline' is required for Next.js inline scripts/styles and CSS-in-JS.
            // 'unsafe-eval' is added in development only — React's HMR and Turbopack
            // require eval() for error overlays and call-stack reconstruction.
            // It is intentionally excluded from production.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`, //for local use on local machine it uses Draco-compressed
              `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`, // required WebAssembly to load Draco-compressed GLTF models in local development
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.vaididea.in https://*.amazonaws.com https://*.s3.ap-south-1.amazonaws.com https://images.unsplash.com https://cdnjs.cloudflare.com",
              "connect-src 'self' blob: https://api.vaididea.in wss://api.vaididea.in https://*.supabase.co",
              "worker-src 'self' blob:",
              "media-src 'self' blob: https://*.vaididea.in https://*.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
          {
            // Restrict browser feature APIs to same-origin only.
            // Allows camera/microphone for telemedicine video consultations.
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
