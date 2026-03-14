'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Type, Palette, AlignLeft } from 'lucide-react';

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        color: 'teal',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*');
        if (!tasksError) setTasks(tasksData || []);

        // Fetch events
        const { data: eventsData, error: eventsError } = await supabase.from('events').select('*');
        if (!eventsError) setEvents(eventsData || []);
        else console.error('Error fetching events:', eventsError);
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    async function handleSaveEvent(e) {
        e.preventDefault();
        setIsSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('You must be logged in to save events.');
            setIsSaving(false);
            return;
        }

        const event = {
            title: newEvent.title,
            description: newEvent.description,
            event_date: newEvent.date,
            color: newEvent.color,
            user_id: user.id
        };

        const { data, error } = await supabase.from('events').insert([event]).select();

        if (error) {
            console.error('Error saving event:', error);
            alert(`Failed to save event: ${error.message}`);
        } else {
            setEvents(prev => [...prev, ...data]);
            setIsModalOpen(false);
            setNewEvent({
                title: '',
                date: new Date().toISOString().split('T')[0],
                color: 'teal',
                description: ''
            });
        }
        setIsSaving(false);
    }

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
            const dayEvents = events.filter(e => e.event_date === dateStr);

            cells.push(
                <div
                    key={`day-${d}`}
                    onClick={() => {
                        setNewEvent(prev => ({ ...prev, date: dateStr }));
                        setIsModalOpen(true);
                    }}
                    className={`min-h-[120px] p-4 text-xs font-black border-r border-b border-slate-50 transition-all hover:bg-slate-50/50 cursor-pointer ${isToday ? 'bg-teal-50/50 ring-inset ring-2 ring-teal-500/20' : 'bg-white'}`}
                >
                    <div className="flex justify-between items-center mb-2">
                        <span className={isToday ? 'text-teal-600' : 'text-slate-900'}>{d}</span>
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>}
                    </div>
                    
                    <div className="space-y-1">
                        {/* Render Events */}
                        {dayEvents.map(e => {
                            const color = e.color || 'teal';
                            return (
                                <div key={e.id} className={`text-[8px] bg-${color}-50 text-${color}-600 border border-${color}-100 p-1.5 rounded-lg truncate font-bold flex items-center gap-1`} title={`Event: ${e.title}`}>
                                    <CalendarIcon className="w-2 h-2 shrink-0" />
                                    {e.title}
                                </div>
                            );
                        })}

                        {/* Render Tasks */}
                        {dayTasks.map(t => {
                            const color = t.priority === 'High' ? 'red' : (t.priority === 'Medium' ? 'orange' : 'teal');
                            return (
                                <div key={t.id} className={`text-[8px] bg-${color}-50 text-${color}-600 border border-${color}-100 p-1.5 rounded-lg truncate font-bold flex items-center gap-1`} title={`Task: ${t.title}`}>
                                    <div className={`w-1 h-1 rounded-full bg-${color}-500 shrink-0`}></div>
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
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="btn-orange flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        New Event
                    </button>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-[600px]">
                    <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100 py-6">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">{day}</div>
                        ))}
                    </div>
                    <div className="flex-1 grid grid-cols-7 bg-slate-100/20 shadow-inner">
                        {renderCells()}
                    </div>
                </div>
            </div>

            {/* Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Create New Event</h3>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveEvent} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                                    <div className="relative">
                                        <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            value={newEvent.title}
                                            onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                            className="w-full pl-12 pr-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold"
                                            placeholder="What's happening?"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <input
                                                type="date"
                                                value={newEvent.date}
                                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                                className="w-full pl-12 pr-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Theme</label>
                                        <div className="relative">
                                            <Palette className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                                            <select
                                                value={newEvent.color}
                                                onChange={e => setNewEvent({ ...newEvent, color: e.target.value })}
                                                className="w-full pl-12 pr-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold text-sm appearance-none"
                                            >
                                                <option value="teal">Teal (Work)</option>
                                                <option value="orange">Orange (Meeting)</option>
                                                <option value="rose">Rose (Urgent)</option>
                                                <option value="indigo">Indigo (Review)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                                    <div className="relative">
                                        <AlignLeft className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                        <textarea
                                            value={newEvent.description}
                                            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                            placeholder="Optional details..."
                                            className="w-full pl-12 pr-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm min-h-[100px] resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)} 
                                        className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="flex-1 btn-teal flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20"
                                    >
                                        {isSaving ? 'Syncing...' : 'Save Event'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
