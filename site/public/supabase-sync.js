/**
 * TaskFlow Supabase Synchronization Utility
 * Handles data fetching and persistence with a localStorage fallback.
 */

const SyncService = {
    // Current user session cache
    currentUser: null,
    initPromise: null,

    async init() {
        if (!window.supabase) return;
        this.initPromise = (async () => {
            const { data: { user } } = await window.supabase.auth.getUser();
            this.currentUser = user;
            return user;
        })();
        return this.initPromise;
    },

    async ensureInit() {
        if (!this.initPromise) await this.init();
        await this.initPromise;
    },

    async hasData() {
        await this.ensureInit();
        if (!window.supabase || !this.currentUser) return false;
        const { count, error } = await window.supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', this.currentUser.id);
        return !error && count > 0;
    },

    // --- PROJECTS ---
    async getProjects() {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { data, error } = await window.supabase
                .from('projects')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (!error && data) {
                // Map DB fields to JS fields
                return data.map(p => ({
                    ...p,
                    desc: p.description
                }));
            }
        }

        // Fallback to localStorage
        const local = localStorage.getItem('tf_projects');
        return local ? JSON.parse(local) : [
            { id: 'p1', name: "Quantum Research", desc: "Tracking developments in superconducting qubits.", progress: 76, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800" },
            { id: 'p2', name: "Supply Chain", desc: "Redesigning routes for the 2026 peak season.", progress: 42, status: "Active", color: "orange", image_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" }
        ];
    },

    async saveProject(project) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { error } = await window.supabase
                .from('projects')
                .upsert({
                    id: project.id,
                    name: project.name,
                    description: project.description || project.desc,
                    progress: project.progress,
                    status: project.status,
                    color: project.color,
                    image_url: project.image_url,
                    user_id: this.currentUser.id
                });
            if (!error) return;
        }

        // Fallback
        const projects = await this.getProjects();
        const index = projects.findIndex(p => p.id === project.id);
        if (index > -1) projects[index] = project;
        else projects.push(project);
        localStorage.setItem('tf_projects', JSON.stringify(projects));
    },

    async deleteProject(projectId) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            try {
                // 1. Delete associated tasks first to avoid FK constraints
                await window.supabase
                    .from('tasks')
                    .delete()
                    .eq('project_id', projectId);

                // 2. Delete the project
                const { error } = await window.supabase
                    .from('projects')
                    .delete()
                    .eq('id', projectId);

                if (error) throw error;
            } catch (err) {
                console.error('Database deletion failed:', err);
            }
        }

        // Always update local storage for fallback consistency
        const projects = await this.getProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        localStorage.setItem('tf_projects', JSON.stringify(filtered));
        
        // Also cleanup local tasks
        const tasks = await this.getTasks();
        const filteredTasks = tasks.filter(t => t.project_id !== projectId);
        localStorage.setItem('tf_tasks', JSON.stringify(filteredTasks));
    },

    // --- TASKS ---
    async getTasks() {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { data, error } = await window.supabase
                .from('tasks')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (!error && data) {
                // Map DB fields to JS fields
                return data.map(t => ({
                    ...t,
                    desc: t.description,
                    column: t.column_id
                }));
            }
        }

        // Fallback
        const local = localStorage.getItem('tf_tasks');
        return local ? JSON.parse(local) : [];
    },

    async getTaskById(taskId) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { data, error } = await window.supabase
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .single();

            if (!error && data) {
                return {
                    ...data,
                    desc: data.description,
                    column: data.column_id
                };
            }
        }

        // Fallback
        const tasks = await this.getTasks();
        return tasks.find(t => t.id === taskId);
    },

    async saveTask(task) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { error } = await window.supabase
                .from('tasks')
                .upsert({
                    id: task.id,
                    title: task.title,
                    description: task.desc,
                    priority: task.priority,
                    project: task.project,
                    column_id: task.column,
                    status: task.status,
                    user_id: this.currentUser.id
                });
            if (!error) return;
        }

        // Fallback
        const tasks = await this.getTasks();
        const index = tasks.findIndex(t => t.id === task.id);
        if (index > -1) tasks[index] = task;
        else tasks.push(task);
        localStorage.setItem('tf_tasks', JSON.stringify(tasks));
    },

    async deleteTask(taskId) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);
        }

        const tasks = await this.getTasks();
        const filtered = tasks.filter(t => t.id !== taskId);
        localStorage.setItem('tf_tasks', JSON.stringify(filtered));
    },

    // --- EVENTS ---
    async getEvents() {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { data, error } = await window.supabase
                .from('events')
                .select('*')
                .eq('user_id', this.currentUser.id);

            if (!error && data) {
                return data;
            }
        }

        // Fallback
        const local = localStorage.getItem('tf_events');
        return local ? JSON.parse(local) : [];
    },

    async saveEvent(event) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { error } = await window.supabase
                .from('events')
                .upsert({
                    id: event.id || undefined,
                    title: event.title,
                    description: event.description,
                    event_date: event.event_date,
                    color: event.color,
                    user_id: this.currentUser.id
                });
            if (!error) return;
        }

        // Fallback
        const events = await this.getEvents();
        if (event.id) {
            const index = events.findIndex(e => e.id === event.id);
            if (index > -1) events[index] = event;
            else events.push(event);
        } else {
            event.id = 'e' + Date.now();
            events.push(event);
        }
        localStorage.setItem('tf_events', JSON.stringify(events));
    },

    // --- PROFILES ---
    async getProfile() {
        await this.ensureInit();
        let profileData = null;

        if (window.supabase && this.currentUser) {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (!error && data) {
                profileData = data;
            } else if (this.currentUser) {
                // Fallback to user metadata (e.g. from Google login)
                const meta = this.currentUser.user_metadata;
                profileData = {
                    full_name: meta.full_name || meta.name || '',
                    avatar_url: meta.avatar_url || meta.picture || '',
                    first_name: meta.full_name ? meta.full_name.split(' ')[0] : (meta.name ? meta.name.split(' ')[0] : ''),
                    last_name: meta.full_name ? meta.full_name.split(' ').slice(1).join(' ') : (meta.name ? meta.name.split(' ').slice(1).join(' ') : '')
                };
            }
        }

        if (!profileData) {
            const local = localStorage.getItem('tf_profile');
            profileData = local ? JSON.parse(local) : {
                first_name: 'Alex',
                last_name: 'Johnson',
                full_name: 'Alex Johnson',
                job_title: 'Senior Project Manager'
            };
        }

        // Logic: If no avatar exists, or if the current avatar is a UI-Avatar, 
        // regenerate it to match the current name/initials.
        const initials = profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || 'User';
        const freshDefaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=E96A2C&color=fff&bold=true`;

        if (!profileData.avatar_url || profileData.avatar_url.includes('ui-avatars.com')) {
            profileData.avatar_url = freshDefaultAvatar;
        }

        return profileData;
    },

    async saveProfile(profile) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { error } = await window.supabase
                .from('profiles')
                .upsert({
                    id: this.currentUser.id,
                    ...profile,
                    updated_at: new Date().toISOString()
                });
            if (!error) return;
        }

        // Fallback
        localStorage.setItem('tf_profile', JSON.stringify(profile));
    },

    async updateProfileUI() {
        const profile = await this.getProfile();

        // Update all avatars
        const avatars = document.querySelectorAll('img[alt="User"]');
        avatars.forEach(img => {
            img.src = profile.avatar_url;
        });

        // Update welcome message (Dashboard)
        const welcomeName = document.getElementById('welcomeName');
        if (welcomeName) {
            welcomeName.innerText = profile.first_name || 'User';
        }

        // Update Nav Profile Name
        const navProfileName = document.getElementById('navProfileName');
        if (navProfileName) {
            navProfileName.innerText = profile.full_name || `${profile.first_name} ${profile.last_name}`;
        }
    },

    async uploadAvatar(file) {
        await this.ensureInit();
        if (!window.supabase || !this.currentUser) {
            console.error('No Supabase client or user session found.');
            return null;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${this.currentUser.id}-${Date.now()}.${fileExt}`;
        const filePath = fileName;

        // Determine content type
        const contentType = file.type || 'image/png';

        console.log('Uploading file:', filePath, 'Type:', contentType);

        const { error: uploadError } = await window.supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                contentType: contentType,
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError.message || uploadError);
            return null;
        }

        const { data } = window.supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        if (!data || !data.publicUrl) {
            console.error('Failed to get public URL');
            return null;
        }

        return data.publicUrl;
    },

    async seedDummyData() {
        await this.ensureInit();
        if (!window.supabase || !this.currentUser) return;

        const dummyProjects = [
            { id: crypto.randomUUID(), name: "AI Strategy 2030", description: "Department-wide LLM integration.", progress: 35, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800" },
            { id: crypto.randomUUID(), name: "Lunar Base Logistics", description: "Scheduling automated cargo transport.", progress: 12, status: "Active", color: "orange", image_url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800" },
            { id: crypto.randomUUID(), name: "Global Supply Chain", description: "Route optimization for peak seasons.", progress: 88, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800" }
        ];

        for (const p of dummyProjects) {
            await window.supabase.from('projects').upsert({
                id: p.id,
                name: p.name,
                description: p.description,
                progress: p.progress,
                status: p.status,
                color: p.color,
                image_url: p.image_url,
                user_id: this.currentUser.id
            });

            // Add some tasks for each project
            const tasks = [
                { id: crypto.randomUUID(), title: `Baseline Audit - ${p.name}`, status: 'Done', column_id: 'done', priority: 'High' },
                { id: crypto.randomUUID(), title: `Stakeholder Review`, status: 'In Progress', column_id: 'in-progress', priority: 'Medium' },
                { id: crypto.randomUUID(), title: `Final Release Candidate`, status: 'Backlog', column_id: 'backlog', priority: 'Low' }
            ];

            for (const t of tasks) {
                await window.supabase.from('tasks').upsert({
                    ...t,
                    project: p.name,
                    project_id: p.id,
                    user_id: this.currentUser.id
                });
            }
        }

        // Add dummy calendar events
        const today = new Date();
        const dummyEvents = [
            { id: crypto.randomUUID(), title: "Strategy Deep Dive", description: "Quarterly alignment session.", event_date: today.toISOString().split('T')[0], color: "teal" },
            { id: crypto.randomUUID(), title: "Lunar Base Sync", description: "Status update on automated cargo.", event_date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], color: "orange" },
            { id: crypto.randomUUID(), title: "UX Audit Presentation", description: "Reviewing premium design enhancements.", event_date: new Date(today.getTime() + 172800000).toISOString().split('T')[0], color: "teal" }
        ];

        for (const e of dummyEvents) {
            await window.supabase.from('events').upsert({
                ...e,
                user_id: this.currentUser.id
            });
        }
    },

    async logout() {
        if (window.supabase) {
            await window.supabase.auth.signOut();
            window.location.href = 'login.html';
        }
    }
};

window.SyncService = SyncService;
SyncService.init();
