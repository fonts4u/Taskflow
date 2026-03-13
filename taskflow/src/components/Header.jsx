'use client';

import { usePathname } from 'next/navigation';
import { Download } from 'lucide-react';

export default function Header() {
    const pathname = usePathname();

    // Map pathname to breadcrumb labels
    const pageTitles = {
        '/dashboard': { parent: 'Workspace', current: 'Dashboard' },
        '/projects': { parent: 'Workspace', current: 'Active Projects' },
        '/kanban': { parent: 'Project Context', current: 'Workspace Board' },
        '/analytics': { parent: 'Intelligence', current: 'Workspace Insights' },
        '/calendar': { parent: 'Workspace', current: 'Schedule' },
    };

    const title = pageTitles[pathname] || { parent: 'Workspace', current: 'TaskFlow' };

    return (
        <header className="h-16 bg-white/70 backdrop-blur-md border-bottom border-teal-600/10 flex items-center justify-between px-8 z-10 shrink-0 sticky top-0">
            <div className="flex items-center gap-4">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title.parent}</span>
                <span className="text-slate-400 text-sm">/</span>
                <span className="text-slate-900 text-sm font-black uppercase tracking-widest">{title.current}</span>
            </div>

            <div className="flex items-center gap-6">
                <button className="text-slate-500 hover:text-teal-600 transition-all transition-colors p-2" title="Export Data">
                    <Download className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <img
                        src={`https://ui-avatars.com/api/?name=User&background=0D9488&color=fff`}
                        className="w-10 h-10 rounded-xl shadow-lg"
                        alt="User"
                    />
                </div>
            </div>
        </header>
    );
}
