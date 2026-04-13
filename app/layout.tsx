import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Validation API - endpnt.dev',
  description: 'Validate emails, phone numbers, and domains instantly with our fast and reliable API',
  keywords: 'email validation, phone validation, domain validation, API, verification',
  authors: [{ name: 'endpnt.dev' }],
  openGraph: {
    title: 'Validation API - endpnt.dev',
    description: 'Validate emails, phone numbers, and domains instantly',
    url: 'https://validate.endpnt.dev',
    siteName: 'endpnt Validation API',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Validation API - endpnt.dev',
    description: 'Validate emails, phone numbers, and domains instantly',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}