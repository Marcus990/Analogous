import type { Metadata } from 'next'
import TermsClient from './TermsClient'

export const metadata: Metadata = {
  title: 'Terms of Service | Analogous AI',
  description:
    'The legal terms for using Analogous AI, including account use, subscriptions, and service policies.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service | Analogous AI',
    description:
      'The legal terms for using Analogous AI, including account use, subscriptions, and service policies.',
    url: 'https://analogous.app/terms',
    siteName: 'Analogous AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Analogous AI — Terms of Service' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | Analogous AI',
    description:
      'The legal terms for using Analogous AI, including account use, subscriptions, and service policies.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
}

function JsonLd({ data }: { data: Record<string, any> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default function TermsPage() {
  // Keep these dates in sync with the visible “Last updated” on the page
  const datePublished = '2025-08-10' // YYYY-MM-DD
  const dateModified = '2025-08-10'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service',
    url: 'https://analogous.app/terms',
    inLanguage: 'en',
    datePublished,
    dateModified,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Analogous AI',
      url: 'https://analogous.app',
    },
  }

  return (
    <>
      <JsonLd data={jsonLd} />
      <TermsClient />
    </>
  )
}
