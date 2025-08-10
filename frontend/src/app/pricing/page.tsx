import type { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Pricing | Analogous AI',
  description:
    'Simple pricing for Analogous AI. Start free, or go Scholar for more power.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Pricing | Analogous AI',
    description:
      'Simple pricing for Analogous AI. Start free, or go Scholar for more power.',
    url: 'https://analogous.app/pricing',
    siteName: 'Analogous AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Analogous AI — Pricing' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Analogous AI',
    description:
      'Simple pricing for Analogous AI. Start free, or go Scholar for more power.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

function JsonLd({ data }: { data: Record<string, any> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default function PricingPage() {
  const pricingJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Analogous AI',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: 'https://analogous.app/pricing',
    description:
      'AI-powered analogy generator that helps learners turn complex topics into clear, relatable explanations.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Curious (Free)',
        price: '0',
        priceCurrency: 'CAD',
        availability: 'https://schema.org/InStock',
        url: 'https://analogous.app/pricing',
        isAccessibleForFree: true,
      },
      {
        '@type': 'Offer',
        name: 'Scholar',
        price: '6.99',
        priceCurrency: 'CAD',
        availability: 'https://schema.org/InStock',
        url: 'https://analogous.app/pricing',
        // If you change pricing, update this too
      },
    ],
  }

  return (
    <>
      <JsonLd data={pricingJsonLd} />
      <PricingClient />
    </>
  )
}
