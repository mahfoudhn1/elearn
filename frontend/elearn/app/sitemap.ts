import type { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://riffaa.com',
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: 'https://riffaa.com/privacy-policy',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://riffaa.com/workwithus/student',
      lastModified: new Date(),
      priority: 0.8,
    },
    {
        url: 'https://riffaa.com/workwithus/teacher',
        lastModified: new Date(),
        priority: 0.8,
      },
  ]
}