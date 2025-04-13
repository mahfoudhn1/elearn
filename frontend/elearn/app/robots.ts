import type { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/lives'],
    },
    sitemap: 'https://riffaa.com/sitemap.xml',
  }
}