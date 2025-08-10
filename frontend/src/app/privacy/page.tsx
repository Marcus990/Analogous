import type { Metadata } from 'next'
import PrivacyClient from './PrivacyClient'

export const metadata: Metadata = {
  title: 'Privacy Policy | Analogous AI',
  description:
    'How Analogous AI collects, uses, and protects your data. Learn about your privacy rights and choices.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy | Analogous AI',
    description:
      'How Analogous AI collects, uses, and protects your data. Learn about your privacy rights and choices.',
    url: 'https://analogous.app/privacy',
    siteName: 'Analogous AI',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Analogous AI — Privacy Policy' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | Analogous AI',
    description:
      'How Analogous AI collects, uses, and protects your data. Learn about your privacy rights and choices.',
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

export default function PrivacyPage() {
  // Keep these dates updated when you change the policy
  const datePublished = '2025-08-10' // YYYY-MM-DD
  const dateModified = '2025-08-10'

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy',
    url: 'https://analogous.app/privacy',
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
      <PrivacyClient />
    </>
  )
}
