import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'Analogous AI | AI Analogy Generator',
  description:
    'Create clear, relatable analogies with AI. Turn complex topics into simple explanations—fast.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Analogous AI | AI Analogy Generator',
    description:
      'Create clear, relatable analogies with AI. Turn complex topics into simple explanations—fast.',
    url: 'https://analogous.app/',
    siteName: 'Analogous AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Analogous AI — AI Analogy Generator' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Analogous AI | AI Analogy Generator',
    description:
      'Create clear, relatable analogies with AI. Turn complex topics into simple explanations—fast.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

export default function Page() {
  return <HomeClient />
}
