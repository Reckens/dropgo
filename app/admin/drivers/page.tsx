"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Search, MoreVertical, Trash2 } from "lucide-react"
import { AdminNav } from "@/components/admin-nav"
import Image from "next/image"

interface Driver {
    id: string
    phone: string
    full_name: string
    profile_image_url: string | null
    is_online: boolean
    created_at: string
}

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([])
    const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [adminUsername, setAdminUsername] = useState("")
    const [deleting, setDeleting] = useState<string | null>(null)
    const router = useRouter()
    const supabase = getSupabaseClient()

    useEffect(() => {
        const adminId = localStorage.getItem("adminId")
        const username = localStorage.getItem("adminUsername")

        if (!adminId || !username) {
            router.push("/admin/login")
            return
        }

        setAdminUsername(username)
        loadDrivers()
    }, [router])

    useEffect(() => {
        if (searchTerm) {
            const filtered = drivers.filter(
                (driver) =>
                    driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    driver.phone.includes(searchTerm)
            )
            setFilteredDrivers(filtered)
        } else {
            setFilteredDrivers(drivers)
        }
    }, [searchTerm, drivers])

    const loadDrivers = async () => {
        try {
            const { data, error } = await supabase
                .from("drivers")
                .select("*")
                .order("is_online", { ascending: false })
                .order("created_at", { ascending: false })

            if (error) throw error

            setDrivers(data || [])
            setFilteredDrivers(data || [])
        } catch (err) {
            console.error("Error loading drivers:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteDriver = async (driverId: string, driverName: string) => {
        setDeleting(driverId)
        try {
            const { error } = await supabase.from("drivers").delete().eq("id", driverId)

            if (error) {
                console.error("Delete error:", error)
                alert(`Error al eliminar: ${error.message}`)
                throw error
            }

            // Remove from local state
            setDrivers((prev) => prev.filter((d) => d.id !== driverId))
            setFilteredDrivers((prev) => prev.filter((d) => d.id !== driverId))
            alert(`${driverName} eliminado correctamente`)
        } catch (err: any) {
            console.error("Error deleting driver:", err)
            alert("Error al eliminar conductor: " + err.message)
        } finally {
            setDeleting(null)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("adminId")
        localStorage.removeItem("adminUsername")
        router.push("/admin/login")
    }

    const onlineDrivers = drivers.filter((d) => d.is_online).length

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Cargando conductores...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminNav onLogout={handleLogout} adminUsername={adminUsername} />

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Conductores</h1>
                    <p className="text-muted-foreground">Gestión de conductores</p>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Total de Conductores</p>
                        <p className="text-2xl font-bold">{drivers.length}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Conductores en Línea</p>
                        <p className="text-2xl font-bold text-green-600">{onlineDrivers}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Resultados de Búsqueda</p>
                        <p className="text-2xl font-bold">{filteredDrivers.length}</p>
                    </Card>
                </div>

                {/* Drivers List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDrivers.map((driver) => (
                        <Card key={driver.id} className="p-4 hover:shadow-lg transition-shadow relative">
                            {/* Dropdown Menu */}
                            <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            disabled={deleting === driver.id}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive cursor-pointer"
                                            onSelect={(e) => {
                                                e.preventDefault()
                                                handleDeleteDriver(driver.id, driver.full_name)
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                        {driver.profile_image_url ? (
                                            <Image
                                                src={driver.profile_image_url}
                                                alt={driver.full_name}
                                                width={48}
                                                height={48}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xl">🚗</div>
                                        )}
                                    </div>
                                    <div
                                        className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${driver.is_online ? "bg-green-500" : "bg-gray-400"
                                            }`}
                                        title={driver.is_online ? "En línea" : "Fuera de línea"}
                                    />
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground truncate">{driver.full_name}</p>
                                        {driver.is_online && (
                                            <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full">
                                                Online
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">{driver.phone}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Registrado: {new Date(driver.created_at).toLocaleDateString()}
                                    </p>

                                </div>
                            </div>
                            {deleting === driver.id && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                                    <p className="text-sm text-muted-foreground">Eliminando...</p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {filteredDrivers.length === 0 && (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No se encontraron conductores</p>
                    </Card>
                )}
            </main>
        </div>
    )
}
