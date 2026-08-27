import { allePosts } from '../lib/blog'

export default function sitemap() {
  const base = 'https://yourwkb.nl'
  const blog = [
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    ...allePosts().map(p => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date((p.updated || p.date) + 'T12:00:00'),
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
  ]
  return [
    ...blog,
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${base}/app`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/avg`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
