import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'Analogous AI | Learn Faster with Analogies',
  description:
    'Turn complex topics into clear, relatable analogies with AI. Learn faster and understand difficult concepts instantly with Analogous AI.',
  alternates: { canonical: '/home' },
  openGraph: {
    title: 'Analogous AI | Learn Faster with Analogies',
    description:
      'Turn complex topics into clear, relatable analogies with AI. Learn faster and understand difficult concepts instantly with Analogous AI.',
    url: 'https://analogous.app/home',
    siteName: 'Analogous AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Analogous AI — Learn Faster with Analogies' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Analogous AI | Learn Faster with Analogies',
    description:
      'Turn complex topics into clear, relatable analogies with AI. Learn faster and understand difficult concepts instantly with Analogous AI.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

export default function HomePage() {
  return <HomeClient />
}
