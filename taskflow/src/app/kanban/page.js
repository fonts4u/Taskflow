'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import TaskCard from '@/components/TaskCard';
import { supabase } from '@/lib/supabase';
import { Plus, Paperclip, FileUp, X, Loader2 } from 'lucide-react';

function KanbanContent() {
    const searchParams = useSearchParams();
    const projectIdParam = searchParams.get('projectId');

    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState(projectIdParam || 'All');
    const [showModal, setShowModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', project: '', priority: 'Medium', desc: '', due: '' });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (projectIdParam) {
            setFilter(projectIdParam);
        }
    }, [projectIdParam]);

    useEffect(() => {
        fetchTasks();
        fetchProjects();
    }, []);

    async function fetchTasks() {
        setLoading(true);
        const { data, error } = await supabase.from('tasks').select('*');
        if (error) {
            console.error('Error fetching tasks:', error);
            setError(error.message);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    }

    async function fetchProjects() {
        const { data, error } = await supabase.from('projects').select('id, name');
        if (!error) setProjects(data);
    }

    const columns = [
        { id: 'backlog', title: 'Backlog', color: 'slate' },
        { id: 'in-progress', title: 'In Progress', color: 'blue' },
        { id: 'on-hold', title: 'On Hold', color: 'orange' },
        { id: 'completed', title: 'Completed', color: 'emerald' },
    ];

    const filteredTasks = filter === 'All'
        ? tasks
        : tasks.filter(t => {
            const projectMatch = t.project_id === filter;
            // Fallback for tasks that might only have the project name or old name-based filtering
            const nameMatch = t.project === projects.find(p => p.id === filter)?.name;
            return projectMatch || nameMatch;
        });

    async function handleDrop(e, columnId) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const task = tasks.find(t => t.id === taskId);
        if (task && task.column_id !== columnId) {
            const { error } = await supabase
                .from('tasks')
                .update({ column_id: columnId })
                .eq('id', taskId);

            if (!error) {
                setTasks(tasks.map(t => t.id === taskId ? { ...t, column_id: columnId } : t));
            }
        }
    }

    async function handleSaveTask(e) {
        e.preventDefault();
        setIsUploading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const selectedProjectId = newTask.project || (filter !== 'All' ? filter : projects[0]?.id);
        const selectedProject = projects.find(p => p.id === selectedProjectId);

        let attachments = [];

        // Handle File Uploads
        if (selectedFiles.length > 0) {
            for (const file of selectedFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${user.id}/${fileName}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('attachments')
                    .upload(filePath, file);

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('attachments')
                        .getPublicUrl(filePath);
                    attachments.push({ name: file.name, url: publicUrl });
                }
            }
        }

        const task = {
            id: crypto.randomUUID(),
            title: newTask.title,
            description: newTask.desc,
            project: selectedProject?.name || 'Internal',
            project_id: selectedProjectId,
            priority: newTask.priority,
            attachments,
            column_id: 'backlog',
            status: 'Backlog',
            due: newTask.due,
            user_id: user?.id
        };

        const { error } = await supabase.from('tasks').insert([task]);
        if (error) {
            console.error('Error saving task:', error);
            alert(`Failed to save task: ${error.message}`);
        } else {
            setTasks(prev => [...prev, task]);
            setShowModal(false);
            setNewTask({ title: '', project: '', priority: 'Medium', desc: '', due: '' });
            setSelectedFiles([]);
        }
        setIsUploading(false);
    }

    async function deleteTask(id) {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) setTasks(tasks.filter(t => t.id !== id));
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 shrink-0">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {filter === 'All' ? 'Workspace Board' : (projects.find(p => p.id === filter)?.name || projects.find(p => p.name === filter)?.name || 'Loading...')}
                        </h1>
                        <span className="bg-teal-50 text-teal-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest border border-teal-100">
                            {filteredTasks.length} Tasks
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Context</label>
                        <select
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-teal-500/20 pr-8 transition-all cursor-pointer hover:border-teal-200"
                        >
                            <option value="All">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex -space-x-2 overflow-hidden border-2 border-white rounded-full p-0.5 bg-white shadow-sm">
                        {[1, 2, 3].map(i => (
                            <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white" src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="" />
                        ))}
                    </div>
                    <button
                        onClick={() => {
                            setNewTask(prev => ({ ...prev, project: filter !== 'All' ? filter : (projects[0]?.id || '') }));
                            setShowModal(true);
                        }}
                        className="btn-teal shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add New Task
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
                {columns.map(col => (
                    <div
                        key={col.id}
                        className="bg-slate-50/50 rounded-[1.5rem] flex flex-col p-4 w-[320px] shrink-0 border border-teal-600/5 min-h-0"
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDrop(e, col.id)}
                    >
                        <h3 className="font-bold flex items-center gap-2 mb-4 px-2 tracking-tight text-slate-800 shrink-0">
                            <span className={`w-2 h-2 rounded-full bg-${col.color}-500`}></span>
                            {col.title}
                            <span className={`text-${col.color}-500 text-xs font-black bg-${col.color}-50 px-2 py-0.5 rounded-lg ml-auto`}>
                                {filteredTasks.filter(t => (t.column_id || 'backlog') === col.id).length}
                            </span>
                        </h3>
                        <div className="tasks-container space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-[100px] pb-4">
                            {filteredTasks
                                .filter(t => (t.column_id || 'backlog') === col.id)
                                .map(t => (
                                    <TaskCard
                                        key={t.id}
                                        task={t}
                                        onDelete={deleteTask}
                                        onDragStart={(e, id) => e.dataTransfer.setData('taskId', id)}
                                    />
                                ))}
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Create New Task</h3>
                        <form onSubmit={handleSaveTask} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full px-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project</label>
                                <select
                                    value={newTask.project}
                                    onChange={e => setNewTask({ ...newTask, project: e.target.value })}
                                    className="w-full px-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold"
                                >
                                    <option value="">Select Project</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Priority</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                                        className="w-full px-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Due Date</label>
                                    <input
                                        type="date"
                                        value={newTask.due}
                                        onChange={e => setNewTask({ ...newTask, due: e.target.value })}
                                        className="w-full px-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quick Note</label>
                                <input
                                    type="text"
                                    value={newTask.desc}
                                    onChange={e => setNewTask({ ...newTask, desc: e.target.value })}
                                    placeholder="Optional details or context..."
                                    className="w-full px-5 py-4 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Attach Assets</label>
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFiles.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-xs font-bold text-slate-600">
                                                <Paperclip className="w-3 h-3" />
                                                <span className="truncate max-w-[120px]">{f.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                    className="text-slate-300 hover:text-red-500"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-slate-100 rounded-xl cursor-pointer hover:border-teal-500 hover:bg-teal-50/20 transition-all text-slate-400 hover:text-teal-600">
                                        <FileUp className="w-5 h-5" />
                                        <span className="text-sm font-bold">Cloud Upload</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={e => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)])}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all">Cancel</button>
                                <button type="submit" disabled={isUploading} className="flex-1 btn-teal flex items-center justify-center gap-2">
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Syncing...
                                        </>
                                    ) : 'Save Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function KanbanPage() {
    return (
        <Layout>
            <Suspense fallback={<div>Loading Kanban board...</div>}>
                <KanbanContent />
            </Suspense>
        </Layout>
    );
}
