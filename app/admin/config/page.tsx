"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Save } from "lucide-react"
import { AdminNav } from "@/components/admin-nav"

interface TaxiConfig {
  baseFare: number
  dayPerKm: number
  nightPerKm: number
  nightStart: number
  nightEnd: number
  extraPerPassenger: number
  routeFactor: number
}

const DEFAULT_CONFIG: TaxiConfig = {
  baseFare: 7,
  dayPerKm: 2.5,
  nightPerKm: 3.5,
  nightStart: 21,
  nightEnd: 6,
  extraPerPassenger: 2,
  routeFactor: 1.2,
}

export default function ConfigPage() {
  const [config, setConfig] = useState<TaxiConfig>(DEFAULT_CONFIG)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adminUsername, setAdminUsername] = useState("")
  const router = useRouter()
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Check if admin is logged in
    const adminId = localStorage.getItem("adminId")
    const username = localStorage.getItem("adminUsername")

    if (!adminId || !username) {
      router.push("/admin/login")
      return
    }

    setAdminUsername(username)
    loadConfig()
  }, [router])

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("global_config")
        .select("config_value")
        .eq("config_key", "tariffs")
        .single()

      if (error) throw error

      if (data?.config_value) {
        setConfig(data.config_value as TaxiConfig)
      }
    } catch (err) {
      console.error("Error loading config:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key: keyof TaxiConfig, value: string) => {
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue)) {
      setConfig((prev) => ({
        ...prev,
        [key]: numValue,
      }))
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from("global_config")
        .update({
          config_value: config,
          updated_by: adminUsername,
          updated_at: new Date().toISOString(),
        })
        .eq("config_key", "tariffs")

      if (error) throw error

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error("Error saving config:", err)
      alert("Error al guardar la configuración")
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminId")
    localStorage.removeItem("adminUsername")
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav onLogout={handleLogout} adminUsername={adminUsername} />

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto">
        <div className="space-y-4">
          <Card className="p-6 bg-card border-border/50">
            <h2 className="text-lg font-semibold text-foreground mb-4">Tarifas del Sistema</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Estas tarifas se aplicarán a todos los conductores y se usarán en la calculadora.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tarifa base (Bs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.baseFare}
                  onChange={(e) => handleChange("baseFare", e.target.value)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Costo inicial de cada viaje</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bs/km (día)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.dayPerKm}
                  onChange={(e) => handleChange("dayPerKm", e.target.value)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Costo por kilómetro durante el día</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bs/km (noche)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.nightPerKm}
                  onChange={(e) => handleChange("nightPerKm", e.target.value)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Costo por kilómetro durante la noche</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Inicio noche (h)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={config.nightStart}
                    onChange={(e) => handleChange("nightStart", e.target.value)}
                    className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Fin noche (h)</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={config.nightEnd}
                    onChange={(e) => handleChange("nightEnd", e.target.value)}
                    className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Extra/pasajero (Bs)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.extraPerPassenger}
                  onChange={(e) => handleChange("extraPerPassenger", e.target.value)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Costo adicional por cada pasajero extra</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Factor de ruta</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.routeFactor}
                  onChange={(e) => handleChange("routeFactor", e.target.value)}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Multiplica la distancia para compensar curvas y giros (1.2 = 20% más)
                </p>
              </div>
            </div>
          </Card>

          {saved && (
            <Card className="p-4 bg-green-500/10 border-green-500/30">
              <p className="text-center text-sm font-semibold text-green-600">✓ Configuración guardada correctamente</p>
            </Card>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
