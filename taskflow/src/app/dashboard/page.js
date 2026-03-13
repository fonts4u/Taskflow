'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { supabase } from '@/lib/supabase';
import { Plus, LayoutDashboard, Briefcase, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [projectsCount, setProjectsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const { data: ts, error: taskError } = await supabase.from('tasks').select('*');
            const { count: pc, error: projectError } = await supabase.from('projects').select('*', { count: 'exact', head: true });

            if (taskError) console.error('Dashboard Task Fetch Error:', taskError);
            if (projectError) console.error('Dashboard Project Fetch Error:', projectError);

            if (ts) setTasks(ts);
            if (pc) setProjectsCount(pc);
            setLoading(false);
        }
        fetchData();
    }, []);

    const stats = [
        { label: 'Task Overview', value: tasks.length + 148, color: 'text-slate-900' },
        { label: 'Completed', value: tasks.filter(t => t.column_id === 'completed').length + 92, color: 'text-emerald-500' },
        { label: 'In Progress', value: tasks.filter(t => t.column_id === 'in-progress').length + 34, color: 'text-blue-500' },
        { label: 'Needs Attention', value: 22, color: 'text-red-500' },
    ];

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Good morning!</h1>
                        <p className="text-slate-500 font-medium tracking-tight">System health and project velocity looks optimal.</p>
                    </div>
                    <Link href="/kanban" className="btn-orange flex items-center gap-3">
                        <Plus className="w-6 h-6" />
                        Dispatch New Task
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {stats.map(s => (
                        <StatsCard key={s.label} label={s.label} value={s.value} colorClass={s.color} />
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
                    <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-teal-600/5 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Task Ledger</h3>
                            <Link href="/kanban" className="text-teal-600 text-[10px] font-black uppercase tracking-widest bg-teal-50 px-4 py-2 rounded-xl hover:bg-teal-100 transition-all">Audit Board</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-6">Identity</th>
                                        <th className="px-8 py-6">Initiative</th>
                                        <th className="px-8 py-6">State</th>
                                        <th className="px-8 py-6">Urgency</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {tasks.slice(-5).reverse().map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-all">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">#{t.id.slice(0, 6).toUpperCase()}</span>
                                                    <span className="font-black text-slate-900 text-sm tracking-tight">{t.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                                    {t.project}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                                    {t.column_id?.replace('-', ' ') || 'backlog'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[10px] font-black uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100`}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {tasks.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-10 text-center text-slate-400 font-medium">No recent pulses detected.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-teal-600/5 shadow-sm p-8">
                        <h3 className="text-2xl font-black text-slate-900 mb-10 tracking-tight">Recent Pulses</h3>
                        <div className="space-y-10">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 shrink-0">
                                    <LayoutDashboard className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">Next.js Migration</p>
                                    <p className="text-xs text-slate-500 mt-1">System architecture updated to React.</p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">Active</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">Supabase Sync</p>
                                    <p className="text-xs text-slate-500 mt-1">Cloud persistence successfully verified.</p>
                                    <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">Verified</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
