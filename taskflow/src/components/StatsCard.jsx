'use client';

export default function StatsCard({ label, value, colorClass = 'text-slate-900', labelColor = 'text-slate-400' }) {
    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-teal-600/5 shadow-sm hover:shadow-md transition-all">
            <p className={`text-[10px] font-black ${labelColor} uppercase tracking-widest mb-4`}>{label}</p>
            <p className={`text-5xl font-black ${colorClass}`}>{value}</p>
        </div>
    );
}
