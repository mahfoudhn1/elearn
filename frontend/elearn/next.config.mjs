/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Enable strict mode for better development checks
  poweredByHeader: false, // Disables Next.js server signature

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Allows your site to be framed by itself and your Jitsi instance.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self' riffaa.com/meeting/;" },
          // Prevents browsers from trying to guess content types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Controls what features and APIs can be used in the browser.
          { 
            key: "Permissions-Policy", 
            value: "camera=*, microphone=*, display-capture=(self), fullscreen=(), clipboard-write=(), hid=(), serial=()" 
          },
          // Tells browsers to prefer HTTPS.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // Enables the browser's built-in XSS protection.
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  transpilePackages: ['react-redux'],
  typescript: {
    ignoreBuildErrors: true,
  },
  compiler: {
    styledComponents: true, // Add support for styled-components
  },

  productionBrowserSourceMaps: false, // Disable source maps in production
};

export default nextConfig;
