'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        async function fetchTasks() {
            const { data, error } = await supabase.from('tasks').select('*');
            if (!error) setTasks(data);
        }
        fetchTasks();
    }, []);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const renderCells = () => {
        const cells = [];
        const today = new Date();

        // Padding from previous month
        for (let i = firstDay - 1; i >= 0; i--) {
            cells.push(
                <div key={`prev-${i}`} className="min-h-[120px] bg-white p-4 opacity-30 text-xs font-black border-r border-b border-slate-50">
                    {daysInPrevMonth - i}
                </div>
            );
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.due === dateStr);

            cells.push(
                <div
                    key={`day-${d}`}
                    className={`min-h-[120px] p-4 text-xs font-black border-r border-b border-slate-50 transition-all hover:bg-slate-50/50 cursor-pointer ${isToday ? 'bg-teal-50/50 ring-inset ring-2 ring-teal-500/20' : 'bg-white'}`}
                >
                    <span className={isToday ? 'text-teal-600' : 'text-slate-900'}>{d}</span>
                    <div className="mt-2 space-y-1">
                        {dayTasks.map(t => {
                            const color = t.priority === 'High' ? 'red' : (t.priority === 'Medium' ? 'orange' : 'teal');
                            return (
                                <div key={t.id} className={`text-[8px] bg-${color}-50 text-${color}-600 border border-${color}-100 p-1.5 rounded-lg truncate font-bold`} title={t.title}>
                                    {t.title}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Padding for next month to fill 42 cells (6 rows)
        const totalCells = cells.length;
        for (let i = 1; i <= 42 - totalCells; i++) {
            cells.push(
                <div key={`next-${i}`} className="min-h-[120px] bg-white p-4 opacity-30 text-xs font-black border-r border-b border-slate-50">
                    {i}
                </div>
            );
        }

        return cells;
    };

    return (
        <Layout>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-6">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{monthName}</h1>
                        <div className="flex items-center gap-2 bg-white shadow-sm p-1 rounded-xl border border-slate-100">
                            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-teal-600">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-all text-slate-400 hover:text-teal-600">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <button className="btn-orange">New Event</button>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-[600px]">
                    <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100 py-6">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</div>
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 bg-slate-100/20">
                        {renderCells()}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
