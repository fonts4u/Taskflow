'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Briefcase,
    Kanban,
    Calendar,
    BarChart3,
    Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: Briefcase },
    { name: 'Kanban', href: '/kanban', icon: Kanban },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white/80 backdrop-blur-md border-r border-teal-600/10 flex flex-col z-20 h-screen fixed">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#0D9488] rounded-lg flex items-center justify-center text-white shrink-0">
                    <Zap className="w-5 h-5 fill-current" />
                </div>
                <span className="text-xl font-black tracking-tight text-[#134E4A]">TaskFlow</span>
            </div>

            <nav className="flex-1 mt-6 px-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
                                isActive
                                    ? "bg-teal-50 text-teal-700 border-r-4 border-teal-600 font-bold"
                                    : "text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
