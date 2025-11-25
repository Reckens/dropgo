import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SupabaseProvider } from "@/components/supabase-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "DropGo",
  description: "Plataforma de transporte privado - Conectando pasajeros y conductores",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body className={`font-sans antialiased`}>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  )
}
