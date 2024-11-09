'use client'

import './globals.css'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Image from 'next/image'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${inter.className} bg-gray-50`}>
        <nav className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse pr-4">
                <Image 
                  src="/logos/Nu7aa Logo.svg" 
                  alt="Logo" 
                  width={50} 
                  height={50} 
                  className="rounded-full"
                />
                <span className="text-xl font-semibold text-gray-800"></span>
              </Link>
              <Link href="/" className="flex items-center space-x-2 rtl:space-x-reverse pr-6">
                <Image 
                  src="/logos/allam.svg" 
                  alt="Logo" 
                  width={50} 
                  height={50} 
                  className="rounded-full"
                />
                <span className="text-xl font-semibold text-gray-800"></span>
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
