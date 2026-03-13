'use client';

import { Briefcase, Archive, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ProjectCard({ project, onToggleArchive, onDelete }) {
    const isArchived = project.status === 'Archived';

    return (
        <div className={`glass-card p-8 flex flex-col ${isArchived ? 'opacity-60 bg-slate-50/50' : ''}`}>
            <div className="flex justify-between items-start mb-8">
                <div className={`w-14 h-14 ${project.color === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-orange-50 text-orange-600'} rounded-2xl flex items-center justify-center`}>
                    <Briefcase className="w-7 h-7" />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => onToggleArchive(project)}
                        className="text-slate-300 hover:text-teal-600 transition-all p-2 bg-slate-50 rounded-xl"
                        title={isArchived ? 'Activate' : 'Archive'}
                    >
                        <Archive className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onDelete(project.id)}
                        className="text-slate-300 hover:text-red-500 transition-all p-2 bg-slate-50 rounded-xl"
                        title="Delete"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <Link href={`/kanban?projectId=${project.id}`} className="cursor-pointer flex-1">
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{project.name}</h3>
                <p className="text-sm text-slate-500 font-medium mb-10 leading-relaxed">{project.desc || project.description}</p>
                <div className="mt-auto space-y-6">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Phase Completion</span>
                        <span className={project.color === 'teal' ? 'text-teal-600' : 'text-orange-600'}>{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                                width: `${project.progress}%`,
                                backgroundColor: project.color === 'teal' ? '#0D9488' : '#F97316'
                            }}
                        ></div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
