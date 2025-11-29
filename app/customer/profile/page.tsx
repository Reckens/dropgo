"use client"

import type React from "react"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UserNav } from "@/components/user-nav"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Upload, ArrowLeft } from "lucide-react"
import { useRef } from "react"

interface Customer {
  id: string
  phone: string
  full_name: string
  profile_image_url: string | null
}

export default function CustomerProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fullName, setFullName] = useState("")
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const customerId = localStorage.getItem("customerId")
        if (!customerId) {
          router.push("/auth/customer")
          return
        }

        const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).single()

        if (error || !data) {
          localStorage.removeItem("customerId")
          router.push("/auth/customer")
          return
        }

        setCustomer(data)
        setFullName(data.full_name)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || "Error al cargar perfil")
        setLoading(false)
      }
    }

    loadCustomer()
  }, [router, supabase])

  const handleUpdateProfile = async () => {
    if (!customer || !fullName.trim()) {
      setError("El nombre no puede estar vacío")
      return
    }

    setUpdating(true)
    setError("")

    try {
      const { error } = await supabase.from("customers").update({ full_name: fullName }).eq("id", customer.id)

      if (error) throw error

      setCustomer({ ...customer, full_name: fullName })
      alert("Perfil actualizado correctamente")
    } catch (err: any) {
      setError(err.message || "Error al actualizar perfil")
    } finally {
      setUpdating(false)
    }
  }

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !customer) return

    setUploading(true)
    setError("")

    try {
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        setError("La imagen debe ser menor a 5MB")
        setUploading(false)
        return
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `${customer.id}-${Date.now()}.${fileExt}`
      const filePath = `customers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-images").getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("customers")
        .update({ profile_image_url: publicUrl })
        .eq("id", customer.id)

      if (updateError) throw updateError

      setCustomer({ ...customer, profile_image_url: publicUrl })
      if (fileInputRef.current) fileInputRef.current.value = ""
      alert("Imagen actualizada correctamente")
    } catch (err: any) {
      setError(err.message || "Error al subir imagen")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Volver atrás"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Datos Personales</h1>
        </div>
        <UserNav userRole="customer" userId={customer.id} />
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto">
        <div className="space-y-4">
          {error && (
            <Card className="p-3 bg-destructive/10 border-destructive/30 text-destructive text-sm">{error}</Card>
          )}

          {/* Profile Image */}
          <Card className="p-6 bg-card border-border/50">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-primary hover:border-primary/80 transition-all cursor-pointer disabled:opacity-50 relative"
                >
                  {customer.profile_image_url ? (
                    <Image
                      src={customer.profile_image_url || "/placeholder.svg"}
                      alt={customer.full_name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-4xl">👤</div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} hidden />
              </div>
              <p className="text-sm text-muted-foreground">Haz clic para cambiar foto</p>
            </div>
          </Card>

          {/* Profile Form */}
          <Card className="p-6 bg-card border-border/50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted text-foreground border border-border/50 rounded-lg focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
                <input
                  type="text"
                  value={customer.phone}
                  disabled
                  className="w-full px-3 py-2 bg-muted/50 text-muted-foreground border border-border/50 rounded-lg opacity-60 cursor-not-allowed"
                />
              </div>

              <Button onClick={handleUpdateProfile} disabled={updating || uploading} className="w-full">
                {updating ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
