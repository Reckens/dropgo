"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { AdminNav } from "@/components/admin-nav"

export default function AdminSettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [adminUsername, setAdminUsername] = useState("")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")
    const [passwordSuccess, setPasswordSuccess] = useState(false)
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
        setLoading(false)
    }, [router])

    const handleChangePassword = async () => {
        setPasswordError("")
        setPasswordSuccess(false)

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordError("Por favor completa todos los campos")
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("Las contraseñas nuevas no coinciden")
            return
        }

        if (newPassword.length < 6) {
            setPasswordError("La contraseña debe tener al menos 6 caracteres")
            return
        }

        setSaving(true)
        try {
            const adminId = localStorage.getItem("adminId")

            // Verify current password
            const { data: admin, error: fetchError } = await supabase
                .from("admins")
                .select("password")
                .eq("id", adminId)
                .single()

            if (fetchError) throw fetchError

            if (admin.password !== currentPassword) {
                setPasswordError("La contraseña actual es incorrecta")
                setSaving(false)
                return
            }

            // Update password
            const { error: updateError } = await supabase
                .from("admins")
                .update({ password: newPassword })
                .eq("id", adminId)

            if (updateError) throw updateError

            setPasswordSuccess(true)
            setCurrentPassword("")
            setNewPassword("")
            setConfirmPassword("")
            setTimeout(() => setPasswordSuccess(false), 3000)
        } catch (err) {
            console.error("Error changing password:", err)
            setPasswordError("Error al cambiar la contraseña")
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
                <p className="text-muted-foreground">Cargando...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminNav onLogout={handleLogout} adminUsername={adminUsername} />

            <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto">
                <div className="space-y-4">
                    <Card className="p-6 bg-card border-border/50">
                        <h2 className="text-lg font-semibold text-foreground mb-4">Cambiar Contraseña</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Actualiza tu contraseña de administrador
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Contraseña actual</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Ingresa tu contraseña actual"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Nueva contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Confirmar nueva contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Repite la nueva contraseña"
                                />
                            </div>

                            {passwordError && (
                                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                                    <p className="text-sm text-destructive">{passwordError}</p>
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <p className="text-sm text-green-600">✓ Contraseña actualizada correctamente</p>
                                </div>
                            )}

                            <Button
                                onClick={handleChangePassword}
                                disabled={saving}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
                            >
                                {saving ? "Actualizando..." : "Actualizar Contraseña"}
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    )
}
