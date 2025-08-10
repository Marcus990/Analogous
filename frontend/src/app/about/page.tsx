import type { Metadata } from 'next'
import AboutClient from './AboutClient'

export const metadata: Metadata = {
  title: 'About Analogous AI',
  description:
    'Learn how Analogous AI turns complex topics into clear analogies. Meet creator Marcus Ng and our mission to make learning click.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Analogous AI',
    description: 'Learn how Analogous AI turns complex topics into clear analogies.',
    url: 'https://analogous.app/about',
    siteName: 'Analogous AI',
    images: [{ url: '/og-image-about.png', width: 1200, height: 630, alt: 'About Analogous AI — Marcus Ng' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Analogous AI',
    description: 'Learn how Analogous AI turns complex topics into clear analogies.',
    images: ['/og-image-about.png'],
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

export default function AboutPage() {
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Marcus Ng',
    url: 'https://analogous.app/about',
    image: 'https://analogous.app/og-image-about.png', // or a dedicated headshot URL
    jobTitle: 'Founder & Engineer, Analogous AI',
    sameAs: [
      'https://www.linkedin.com/in/marcusng01/',
      'https://twitter.com/_marcus_ng',
      'https://www.instagram.com/tryanalogous/',
      'https://github.com/Marcus990',
    ],
    worksFor: {
      '@type': 'Organization',
      name: 'Analogous AI',
      url: 'https://analogous.app',
    },
  }

  return (
    <>
      <JsonLd data={personJsonLd} />
      <AboutClient />
    </>
  )
}
