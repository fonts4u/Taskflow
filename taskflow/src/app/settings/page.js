'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Camera, Shield, Bell, Users, CreditCard, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        async function getSession() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        }
        getSession();
    }, []);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/login');
    }

    const tabs = [
        { id: 'profile', name: 'Profile', icon: Users },
        { id: 'team', name: 'Team Management', icon: Users },
        { id: 'notifications', name: 'Notifications', icon: Bell },
        { id: 'security', name: 'Security', icon: Shield },
        { id: 'billing', name: 'Billing & Plans', icon: CreditCard },
    ];

    return (
        <Layout>
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Account Settings</h1>
                    <p className="text-slate-500 mt-2 font-medium tracking-tight">Configure your personal and workspace preferences.</p>
                </div>
                <button className="btn-teal">Save Changes</button>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                <aside className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all text-left ${tab.id === 'profile' ? 'bg-teal-50 text-teal-700 border-r-4 border-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </button>
                    ))}
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <button onClick={handleLogout} className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm text-red-500 hover:bg-red-50 transition-all w-full">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </aside>

                <div className="flex-1 space-y-10">
                    <section className="bg-white p-10 rounded-[2.5rem] border border-teal-600/5 shadow-sm">
                        <h2 className="text-2xl font-black mb-10 tracking-tight text-slate-900">Public Profile</h2>

                        <div className="flex items-center gap-10 mb-12">
                            <div className="relative group">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${user?.email?.split('@')[0] || 'User'}&background=0D9488&color=fff&size=128`}
                                    className="w-32 h-32 rounded-[2.5rem] shadow-2xl border-4 border-white"
                                    alt="Profile"
                                />
                                <button className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 hover:bg-slate-50 transition-all text-teal-600">
                                    <Camera className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avatar Signature</p>
                                <div className="flex gap-4">
                                    <button className="text-[#0D9488] font-black text-xs bg-teal-50 px-6 py-3 rounded-xl hover:bg-teal-100 transition-all uppercase tracking-widest">Upload New</button>
                                    <button className="text-red-500 font-black text-xs px-4 py-3 rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest">Remove</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</label>
                                <input type="text" defaultValue="Alex" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-teal-500/10 font-bold" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Surname</label>
                                <input type="text" defaultValue="Johnson" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-teal-500/10 font-bold" />
                            </div>
                            <div className="md:col-span-2 space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Address</label>
                                <input type="email" defaultValue={user?.email || ''} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-none outline-none focus:ring-4 focus:ring-teal-500/10 font-bold" />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-10 rounded-[2.5rem] border border-teal-600/5 shadow-sm">
                        <h2 className="text-2xl font-black mb-8 tracking-tight text-slate-900">Security & Privacy</h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-8 bg-slate-50/50 rounded-3xl border border-slate-100">
                                <div>
                                    <p className="font-black text-slate-900 tracking-tight">Two-Factor Authentication</p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">Add an encrypted layer of security to your session.</p>
                                </div>
                                <div className="w-14 h-8 bg-slate-200 rounded-full flex items-center px-1 cursor-pointer transition-all hover:bg-slate-300">
                                    <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-8 bg-slate-50/50 rounded-3xl border border-slate-100">
                                <div>
                                    <p className="font-black text-slate-900 tracking-tight">Security Credentials</p>
                                    <p className="text-xs text-slate-500 mt-1 font-medium">Last updated cycle: Phase 4.</p>
                                </div>
                                <button className="text-[#0D9488] font-black text-[10px] uppercase tracking-widest bg-white px-6 py-3 rounded-xl border border-teal-600/10 shadow-sm hover:bg-teal-50 transition-all">Update Key</button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
