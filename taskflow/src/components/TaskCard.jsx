'use client';

import { Trash2, Paperclip } from 'lucide-react';

export default function TaskCard({ task, onDelete, onDragStart }) {
    const priorityColor = task.priority === 'High' ? 'red' : (task.priority === 'Medium' ? 'orange' : 'teal');
    const taskId = task.id ? `#${task.id.slice(0, 6).toUpperCase()}` : '#NEW';

    return (
        <div
            id={task.id}
            className="task-card bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing mb-4 group"
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-${priorityColor}-500`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{taskId}</span>
                </div>
                <button
                    onClick={() => onDelete(task.id)}
                    className="text-slate-200 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-6 leading-tight">{task.title}</h4>
            <div className="flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[8px] font-black text-slate-500 border border-slate-100">
                        {task.project?.charAt(0) || 'P'}
                    </div>
                    {task.attachments && task.attachments.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-400">
                            <Paperclip className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{task.attachments.length}</span>
                        </div>
                    )}
                </div>
                <span className={`bg-${priorityColor}-50 text-${priorityColor}-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest`}>
                    {task.priority}
                </span>
            </div>
        </div>
    );
}
