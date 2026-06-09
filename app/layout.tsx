import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/context/CartContext'
import { CustomerProvider } from '@/context/CustomerContext'
import { EmployeeProvider } from '@/context/EmployeeContext'
import { RiderProvider } from '@/context/RiderContext'
import { BranchProvider } from '@/context/BranchContext'
import { AdminProvider } from '@/context/AdminContext'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shakey's Delivery System",
  description: "Order your favorite Shakey's pizza, chicken, and pasta online for delivery or pickup",
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
    <body className="font-sans antialiased">
    <BranchProvider>
    <AdminProvider>
    <RiderProvider>
    <EmployeeProvider>
    <CustomerProvider>
    <CartProvider>
    {children}
    </CartProvider>
    </CustomerProvider>
    </EmployeeProvider>
    </RiderProvider>
    </AdminProvider>
    </BranchProvider>
    {process.env.NODE_ENV === 'production' && <Analytics />}
    </body>
    </html>
  )
}