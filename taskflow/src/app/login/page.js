'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) router.push('/dashboard');
        };
        checkUser();
    }, [router]);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error, data } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else if (data.user) {
            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 500);
        }
    }

    return (
        <div className="min-h-screen bg-[#F0FDFA] flex items-center justify-center p-6 selection:bg-teal-100">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-[#0D9488] rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                            <Zap className="w-6 h-6 fill-current" />
                        </div>
                        <span className="text-2xl font-black text-[#134E4A] tracking-tight">TaskFlow</span>
                    </Link>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Welcome back</h1>
                    <p className="text-slate-500 font-medium mt-2">Resume your peak productivity.</p>
                </div>

                <div className="bg-white/70 backdrop-blur-xl p-10 rounded-[2.5rem] border border-teal-600/10 shadow-2xl relative overflow-hidden">
                    {success ? (
                        <div className="py-12 text-center animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Authenticated</h2>
                            <p className="text-slate-500 font-medium">Entering your workspace...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Work Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-bold text-lg"
                                    placeholder="alex@acme.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Access Key</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-bold text-lg"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-xs font-bold leading-tight">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 rounded-2xl bg-[#0D9488] text-white font-black text-lg shadow-xl shadow-teal-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading ? 'Authenticating...' : 'Enter Workspace'}
                            </button>
                        </form>
                    )}
                </div>

                <p className="mt-10 text-center text-slate-400 font-bold text-sm">
                    New to the flow? <Link href="/signup" className="text-[#0D9488] hover:underline">Provision an account</Link>
                </p>
            </div>
        </div>
    );
}
