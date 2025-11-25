"use client"

export const dynamic = "force-dynamic"

import Link from "next/link"
import { Card } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-background to-secondary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">DropGo</h1>
          <p className="text-lg text-muted-foreground">Elige tu rol para comenzar</p>
        </div>

        {/* Role Selection Cards - Click directo sin botón */}
        <div className="space-y-12">
          {/* Cliente Card */}
          <Link href="/auth/customer">
            <Card className="p-8 cursor-pointer transition-all border-2 border-border/50 hover:border-primary hover:shadow-lg hover:scale-105 transform duration-300 bg-card rounded-xl">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-6xl">👤</div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Cliente</h2>
                  <p className="text-muted-foreground">Solicita un viaje</p>
                </div>
              </div>
            </Card>
          </Link>

          {/* Conductor Card */}
          <Link href="/auth">
            <Card className="p-8 cursor-pointer transition-all border-2 border-border/50 hover:border-primary hover:shadow-lg hover:scale-105 transform duration-300 bg-card rounded-xl">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="text-6xl">🚗</div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">Conductor</h2>
                  <p className="text-muted-foreground">Ofrece viajes</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
