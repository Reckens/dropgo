"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, Users, Car, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminNavProps {
    onLogout: () => void
    adminUsername: string
}

export function AdminNav({ onLogout, adminUsername }: AdminNavProps) {
    const pathname = usePathname()

    const navItems = [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/config", label: "Configuración", icon: Settings },
        { href: "/admin/customers", label: "Clientes", icon: Users },
        { href: "/admin/drivers", label: "Conductores", icon: Car },
    ]

    return (
        <div className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">DG</span>
                            </div>
                            <span className="font-bold text-lg">Admin Panel</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant={isActive ? "default" : "ghost"}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <Icon className="w-4 h-4" />
                                            {item.label}
                                        </Button>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground hidden sm:block">
                            👤 {adminUsername}
                        </span>
                        <Button variant="ghost" size="sm" onClick={onLogout} className="gap-2">
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Salir</span>
                        </Button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "default" : "ghost"}
                                    size="sm"
                                    className="gap-2 whitespace-nowrap"
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
