'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProjectCard from '@/components/ProjectCard';
import { supabase } from '@/lib/supabase';
import { Plus } from 'lucide-react';

export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', desc: '' });

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        setLoading(true);
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) {
            setProjects(data);
        }
        setLoading(false);
    }

    async function handleCreateProject(e) {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();

        const project = {
            id: crypto.randomUUID(),
            name: newProject.name,
            description: newProject.desc,
            progress: 0,
            status: "Planning",
            color: "orange",
            user_id: user?.id
        };

        const { error } = await supabase.from('projects').insert([project]);
        if (!error) {
            setProjects([project, ...projects]);
            setShowModal(false);
            setNewProject({ name: '', desc: '' });
        }
    }

    async function toggleArchive(project) {
        const newStatus = project.status === 'Archived' ? 'Active' : 'Archived';
        const { error } = await supabase
            .from('projects')
            .update({ status: newStatus })
            .eq('id', project.id);

        if (!error) {
            setProjects(projects.map(p => p.id === project.id ? { ...p, status: newStatus } : p));
        }
    }

    async function deleteProject(id) {
        if (!confirm('Are you sure? All tasks will be deleted.')) return;

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (!error) {
            setProjects(projects.filter(p => p.id !== id));
        }
    }

    return (
        <Layout>
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Global Initiatives</h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage, track, and archive your project ecosystem.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-orange">Launch New Project</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-400 font-bold">Loading initiatives...</div>
                ) : projects.length === 0 ? (
                    <div className="col-span-full py-20 text-center flex flex-col items-center justify-center opacity-50">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                            <Briefcase className="w-12 h-12" />
                        </div>
                        <p className="font-black text-sm uppercase tracking-widest text-slate-400">Workspace is empty. Launch your first initiative.</p>
                    </div>
                ) : (
                    projects.map(p => (
                        <ProjectCard
                            key={p.id}
                            project={p}
                            onToggleArchive={toggleArchive}
                            onDelete={deleteProject}
                        />
                    ))
                )}

                <button
                    onClick={() => setShowModal(true)}
                    className="border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-slate-400 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50/20 transition-all group min-h-[300px]"
                >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-teal-50 transition-all font-bold">
                        <Plus className="w-10 h-10" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest">New Initiative</span>
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                        <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tight">Launch Project</h3>
                        <form onSubmit={handleCreateProject} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Initiative Name</label>
                                <input
                                    type="text"
                                    value={newProject.name}
                                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-bold text-lg"
                                    placeholder="e.g. Orion Redesign"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Overview</label>
                                <textarea
                                    rows="3"
                                    value={newProject.desc}
                                    onChange={e => setNewProject({ ...newProject, desc: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl border-none bg-slate-50 focus:bg-white focus:ring-4 focus:ring-teal-500/10 outline-none transition-all font-medium text-sm"
                                    placeholder="Describe the mission..."
                                />
                            </div>
                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-400 hover:text-slate-600 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 btn-orange">Create Project</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
