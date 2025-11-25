"use client"

export const dynamic = "force-dynamic"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"

export default function CustomerAuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [phone, setPhone] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(null)

  useEffect(() => {
    setSupabase(getSupabaseClient())
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    if (!supabase) {
      setError("Conectando...")
      setLoading(false)
      return
    }

    try {
      const normalizedPhone = phone.replace(/[\s\-().+]/g, "").trim()

      if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
        setError("Teléfono inválido. Usa mínimo 8 dígitos.")
        setLoading(false)
        return
      }

      if (isLogin) {
        const { data: customers, error: queryError } = await supabase
          .from("customers")
          .select("*")
          .eq("phone", normalizedPhone)
          .limit(1)

        if (queryError || !customers || customers.length === 0) {
          setError("Cliente no encontrado. Por favor regístrate primero.")
          setLoading(false)
          return
        }

        // Simple password-less login
        localStorage.setItem("customerId", customers[0].id)
        localStorage.setItem("customerPhone", customers[0].phone)
        router.push("/customer")
      } else {
        // Register
        if (!fullName.trim()) {
          setError("Por favor ingresa tu nombre completo")
          setLoading(false)
          return
        }

        const { data: existingCustomer, error: checkError } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", normalizedPhone)
          .limit(1)

        if (checkError) {
          console.error("[v0] Check existing customer error:", checkError)
        }

        if (existingCustomer && existingCustomer.length > 0) {
          setError("Este número de teléfono ya está registrado")
          setLoading(false)
          return
        }

        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert([
            {
              phone: normalizedPhone,
              full_name: fullName.trim(),
            },
          ])
          .select()
          .limit(1)

        if (insertError) {
          console.error("[v0] Insert error:", insertError)
          setError(`Error al registrar: ${insertError.message}`)
          setLoading(false)
          return
        }

        if (!newCustomer || newCustomer.length === 0) {
          setError("Error al registrar. Intenta nuevamente.")
          setLoading(false)
          return
        }

        // Store customer ID and redirect
        localStorage.setItem("customerId", newCustomer[0].id)
        localStorage.setItem("customerPhone", newCustomer[0].phone)
        router.push("/customer")
      }
    } catch (err: any) {
      console.error("[v0] Auth error:", err)
      setError(err.message || "Ocurrió un error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-background to-secondary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="p-6 bg-card border-border/50">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">DropGo Cliente</h1>
            <p className="text-muted-foreground text-sm">
              {isLogin ? "Inicia sesión con tu teléfono" : "Crea tu cuenta de cliente"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
              <input
                type="tel"
                placeholder="Ej: +591 XXXXXXXXX o 7XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-muted text-foreground border border-border/50 rounded-lg focus:border-primary focus:outline-none"
                disabled={loading || !supabase}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted text-foreground border border-border/50 rounded-lg focus:border-primary focus:outline-none"
                  disabled={loading || !supabase}
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading || !supabase} className="w-full">
              {!supabase ? "Cargando..." : loading ? "Procesando..." : isLogin ? "Iniciar Sesión" : "Registrarse"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError("")
                }}
                className="ml-2 font-semibold text-primary hover:underline"
                disabled={!supabase}
              >
                {isLogin ? "Regístrate" : "Inicia sesión"}
              </button>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
