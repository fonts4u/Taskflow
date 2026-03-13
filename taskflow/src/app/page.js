'use client';

import Link from 'next/link';
import { Zap, ArrowRight, PlayCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-[#F0FDFA] min-h-screen text-[#134E4A] selection:bg-teal-100 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-teal-600/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#0D9488] rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight">TaskFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <a href="#features" className="font-medium hover:text-[#0D9488] transition-colors">Features</a>
            <a href="#about" className="font-medium hover:text-[#0D9488] transition-colors">About</a>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hidden sm:block font-semibold hover:text-[#0D9488] transition-colors">Log In</Link>
            <Link href="/signup" className="bg-[#F97316] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="pt-48 pb-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-sm border border-teal-100 px-4 py-2 rounded-full mb-10 animate-fade-in shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-teal-500"></span>
            <span className="text-sm font-semibold text-teal-700">New: AI Workflow Automation is here</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tight text-slate-900">
            The future of work, <br />
            <span className="text-[#0D9488]">organized.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 max-w-3xl mb-12 leading-relaxed">
            Elevate your team's productivity with our glass-morphic interface designed for
            high-performance workflows and crystal-clear clarity.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 mb-20 w-full justify-center">
            <Link href="/signup" className="bg-[#F97316] text-white px-10 py-5 rounded-2xl font-black text-lg w-full sm:w-auto text-center shadow-2xl shadow-orange-500/30 hover:scale-105 transition-all">
              Get Started for Free
            </Link>
            <button className="bg-white border-2 border-slate-200 px-10 py-5 rounded-2xl font-black text-lg hover:border-teal-500 transition-all w-full sm:w-auto text-center flex items-center justify-center gap-2">
              <PlayCircle className="w-6 h-6" /> Request Demo
            </button>
          </div>

          {/* Dash mockup simplified */}
          <div className="relative w-full max-w-5xl group mt-12">
            <div className="absolute inset-0 bg-teal-500/20 blur-[120px] rounded-full opacity-30 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white/40 backdrop-blur-3xl rounded-[2.5rem] border-[12px] border-white shadow-2xl overflow-hidden aspect-[16/10] p-4">
              <div className="w-full h-full bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden flex">
                <div className="w-16 border-r border-slate-200 flex flex-col items-center py-8 gap-8 bg-white/50">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10"></div>
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10"></div>
                  <div className="w-8 h-8 rounded-lg bg-teal-500/80"></div>
                </div>
                <div className="flex-1 p-8 space-y-8">
                  <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                  <div className="grid grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100 shadow-sm"></div>)}
                  </div>
                  <div className="h-64 bg-white rounded-2xl border border-slate-100 shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-32 px-6 bg-white/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Everything you need to <span className="text-[#0D9488]">scale.</span></h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">Powerful tools designed for the modern team workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { title: 'Kanban Mastery', color: 'teal', desc: 'Beautifully designed drag-and-drop boards that keep your workflow fluid.' },
              { title: 'Smart Calendar', color: 'blue', desc: 'Never miss a deadline with our intelligent schedule tracking.' },
              { title: 'Deep Analytics', color: 'orange', desc: 'Visualize your productivity gains with powerful charts.' }
            ].map((f, i) => (
              <div key={i} className="glass-card p-10 group cursor-pointer hover:bg-white/80 transition-all">
                <div className={`w-16 h-16 bg-${f.color}-500/10 rounded-2xl flex items-center justify-center text-${f.color}-600 mb-8`}>
                  <Zap className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed mb-6">{f.desc}</p>
                <div className={`text-${f.color}-600 font-black flex items-center gap-2 group-hover:gap-4 transition-all uppercase tracking-widest text-xs`}>
                  Explore <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-teal-100 bg-white/50 mt-32">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#0D9488] rounded-xl flex items-center justify-center text-white">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div className="text-left">
              <span className="text-2xl font-black block leading-none">TaskFlow</span>
              <span className="text-sm text-slate-500 font-medium">The peak of productivity.</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 font-medium">&copy; 2026 TaskFlow. Rebuilt with Next.js</p>
        </div>
      </footer>
    </div>
  );
}
