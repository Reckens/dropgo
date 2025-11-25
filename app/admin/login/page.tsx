"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Lock, User } from "lucide-react"

export default function AdminLoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = getSupabaseClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            // Simple authentication for now (TODO: implement bcrypt properly)
            if (username === "admin" && password === "admin123") {
                // Store admin session
                localStorage.setItem("adminId", "admin-id")
                localStorage.setItem("adminUsername", "admin")

                // Redirect to dashboard
                router.push("/admin/dashboard")
            } else {
                setError("Usuario o contraseña incorrectos")
                setLoading(false)
            }
        } catch (err: any) {
            setError("Error al iniciar sesión")
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Panel de Administrador</h1>
                    <p className="text-sm text-muted-foreground">Inicia sesión para gestionar DropGo</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            <User className="w-4 h-4 inline mr-2" />
                            Usuario
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 bg-muted text-foreground border border-border rounded-lg focus:border-primary focus:outline-none"
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            <Lock className="w-4 h-4 inline mr-2" />
                            Contraseña
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 bg-muted text-foreground border border-border rounded-lg focus:border-primary focus:outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3"
                    >
                        {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                </form>

                <div className="text-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/")}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Volver al inicio
                    </Button>
                </div>
            </Card>
        </div>
    )
}
