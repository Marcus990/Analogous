// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import { AuthProvider } from '@/lib/auth'
import { StreakProvider } from '@/lib/streakContext'
import { NotificationProvider } from '@/lib/notificationContext'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://analogous.app'),
  title: {
    default: 'Analogous AI | AI Analogy Generator',
    template: '%s • Analogous AI'
  },
  description:
    'Turn complex topics into clear, relatable analogies with our AI analogy generator. Learn faster with Analogous AI.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://analogous.app/',
    siteName: 'Analogous AI',
    title: 'Analogous AI | AI Analogy Generator',
    description: 'Turn complex topics into clear, relatable analogies.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Analogous AI | AI Analogy Generator' }]
  },  
  twitter: {
    card: 'summary_large_image',
    title: 'Analogous AI | AI Analogy Generator',
    description: 'Turn complex topics into clear, relatable analogies.',
    images: ['/og-image.png'],
    creator: '@_marcus_ng'
    // site: '@tryanalogous' // add later when you make the brand handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 }
  },
  verification: {
    // Replace this once you get your token from Google Search Console
    google: 'JsTww5EYiz69iGAL0OiWzTwfcvINesgN1AJD3aOGxAQ'
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }]
  },
  manifest: '/site.webmanifest',
  category: 'education'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#000000',
  colorScheme: 'dark'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Analogous AI',
    alternateName: 'Analogous',
    url: 'https://analogous.app'
  }

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Analogous AI',
    url: 'https://analogous.app',
    logo: 'https://analogous.app/og-image.png',
    sameAs: [
      'https://www.linkedin.com/in/marcusng01/',
      'https://twitter.com/_marcus_ng',
      'https://www.instagram.com/tryanalogous/',
      'https://github.com/Marcus990'
    ]
  }

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Analogous AI',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description:
      'AI-powered platform that generates analogies to help users learn complex topics faster and more effectively.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://analogous.app'
  }

  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }} />
      </head>
      <body className={`${inter.className} bg-black min-h-screen text-white`}>
        <AuthProvider>
          <NotificationProvider>
            <StreakProvider>
              <Navigation />
              <main id="main-content">{children}</main>
              <Footer />
            </StreakProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
