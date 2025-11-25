"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Users, Car, Activity, DollarSign, TrendingUp } from "lucide-react"
import { AdminNav } from "@/components/admin-nav"

interface Statistics {
    totalCustomers: number
    totalDrivers: number
    activeDrivers: number
    ridesToday: number
    estimatedRevenue: number
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Statistics>({
        totalCustomers: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        ridesToday: 0,
        estimatedRevenue: 0,
    })
    const [loading, setLoading] = useState(true)
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
        loadStatistics()

        // Auto-refresh every 30 seconds
        const interval = setInterval(loadStatistics, 30000)
        return () => clearInterval(interval)
    }, [router])

    const loadStatistics = async () => {
        try {
            // Get total customers
            const { count: customersCount } = await supabase
                .from("customers")
                .select("*", { count: "exact", head: true })

            // Get total drivers
            const { count: driversCount } = await supabase
                .from("drivers")
                .select("*", { count: "exact", head: true })

            // Get active drivers (online)
            const { count: activeCount } = await supabase
                .from("drivers")
                .select("*", { count: "exact", head: true })
                .eq("is_online", true)

            // Get rides today
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { count: ridesTodayCount } = await supabase
                .from("ride_requests")
                .select("*", { count: "exact", head: true })
                .gte("created_at", today.toISOString())

            // Get completed rides today for revenue estimation
            const { data: completedRides } = await supabase
                .from("ride_requests")
                .select("*")
                .eq("status", "completed")
                .gte("created_at", today.toISOString())

            // Estimate revenue (assuming average fare of 20 Bs)
            const avgFare = 20
            const revenue = (completedRides?.length || 0) * avgFare

            setStats({
                totalCustomers: customersCount || 0,
                totalDrivers: driversCount || 0,
                activeDrivers: activeCount || 0,
                ridesToday: ridesTodayCount || 0,
                estimatedRevenue: revenue,
            })
        } catch (err) {
            console.error("Error loading statistics:", err)
        } finally {
            setLoading(false)
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
                <p className="text-muted-foreground">Cargando estadísticas...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminNav onLogout={handleLogout} adminUsername={adminUsername} />

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground">Estadísticas generales de DropGo</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Total Customers */}
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalCustomers}</p>
                                <p className="text-xs text-muted-foreground mt-1">Usuarios registrados</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </Card>

                    {/* Total Drivers */}
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Conductores</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{stats.totalDrivers}</p>
                                <p className="text-xs text-muted-foreground mt-1">Conductores registrados</p>
                            </div>
                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <Car className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                    </Card>

                    {/* Active Drivers */}
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Conductores Activos</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{stats.activeDrivers}</p>
                                <p className="text-xs text-muted-foreground mt-1">En línea ahora</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                <Activity className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                    </Card>

                    {/* Rides Today */}
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Viajes Hoy</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{stats.ridesToday}</p>
                                <p className="text-xs text-muted-foreground mt-1">Solicitudes del día</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </Card>

                    {/* Estimated Revenue */}
                    <Card className="p-6 hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ingresos Estimados Hoy</p>
                                <p className="text-3xl font-bold text-foreground mt-2">{stats.estimatedRevenue} Bs</p>
                                <p className="text-xs text-muted-foreground mt-1">Basado en viajes completados (promedio 20 Bs/viaje)</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-amber-500" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-foreground mb-4">Accesos Rápidos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card
                            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push("/admin/config")}
                        >
                            <p className="font-medium">⚙️ Configurar Tarifas</p>
                            <p className="text-sm text-muted-foreground mt-1">Ajustar tarifas globales</p>
                        </Card>
                        <Card
                            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push("/admin/customers")}
                        >
                            <p className="font-medium">👥 Ver Clientes</p>
                            <p className="text-sm text-muted-foreground mt-1">Lista completa de usuarios</p>
                        </Card>
                        <Card
                            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => router.push("/admin/drivers")}
                        >
                            <p className="font-medium">🚗 Ver Conductores</p>
                            <p className="text-sm text-muted-foreground mt-1">Gestionar conductores</p>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
