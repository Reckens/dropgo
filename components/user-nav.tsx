"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { LogOut, User, Zap } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"

interface UserNavProps {
  userRole: "customer" | "driver"
  userId?: string
}

export function UserNav({ userRole, userId }: UserNavProps) {
  const router = useRouter()
  const [userImage, setUserImage] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const loadUserImage = async () => {
      if (!userId) {
        return
      }

      try {
        const table = userRole === "customer" ? "customers" : "drivers"
        const { data, error } = await supabase.from(table).select("profile_image_url").eq("id", userId).single()

        if (!error && data?.profile_image_url) {
          setUserImage(data.profile_image_url)
        }
      } catch (err) {
        console.error("[v0] Error loading user image:", err)
      }
    }

    loadUserImage()
  }, [userRole, userId, supabase])

  const handleLogout = () => {
    const storageKey = userRole === "customer" ? "customerId" : "driverId"
    const phoneKey = userRole === "customer" ? "customerPhone" : "driverPhone"

    localStorage.removeItem(storageKey)
    localStorage.removeItem(phoneKey)
    localStorage.removeItem("userType")

    router.push("/")
  }

  const profileRoute = userRole === "driver" ? "/driver/profile" : "/customer/profile"

  return (
    <div className="flex items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 rounded-full p-0 overflow-hidden border-2 border-primary/50 hover:border-primary transition-all"
            title="Menú de usuario"
          >
            {userImage ? (
              <Image
                src={userImage || "/placeholder.svg"}
                alt="Avatar de usuario"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-lg">👤</div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link href={profileRoute} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Datos Personales</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
