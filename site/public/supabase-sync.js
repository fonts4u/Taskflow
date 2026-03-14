/**
 * TaskFlow Supabase Synchronization Utility
 * Handles data fetching and persistence with a localStorage fallback.
 */

const SyncService = {
    // Current user session cache
    currentUser: null,
    initPromise: null,

    // Generic Logo SVG for consistency
    LOGO_SVG: `
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="6" fill="#E96A2C"/>
            <path d="M13 6L7 13H11L10 18L16 11H12L13 6Z" fill="white"/>
        </svg>
    `,

    // Robust ID generator
    generateId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'tf-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
    },

    async getDashboardStats() {
        const tasks = await this.getTasks();
        const projects = await this.getProjects();
        
        const completed = tasks.filter(t => t.status === 'Done' || t.column === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress' || t.column === 'in-progress').length;
        const delayed = tasks.filter(t => t.priority === 'High' && (t.status === 'Backlog' || t.column === 'backlog')).length;

        return {
            totalTasks: tasks.length,
            completedTasks: completed,
            inProgressTasks: inProgress,
            delayedTasks: delayed,
            totalProjects: projects.length
        };
    },

    checkDebugMode() {
        if (window.location.search.includes('debug=true')) {
            sessionStorage.setItem('tf_debug', 'true');
            console.log('SyncService: Debug mode enabled and persisted.');
        }
        return sessionStorage.getItem('tf_debug') === 'true';
    },

    updateLinks() {
        if (this.checkDebugMode()) {
            document.querySelectorAll('a').forEach(a => {
                const href = a.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.includes('debug=true')) {
                    const separator = href.includes('?') ? '&' : '?';
                    a.setAttribute('href', href + separator + 'debug=true');
                }
            });
        }
    },

    async getProjects() {
        await this.ensureInit(); // Ensure we have the user context if needed
        const projects = await this.getProjectsData();
        return projects;
    },

    navigate(url) {
        const isDebug = window.location.search.includes('debug=true') || sessionStorage.getItem('tf_debug') === 'true';
        const separator = url.includes('?') ? '&' : '?';
        const target = isDebug && !url.includes('debug=true') ? url + separator + 'debug=true' : url;
        window.location.href = target;
    },

    async init() {
        if (!window.supabase || !window.supabase.auth) {
            console.error('TaskFlow: Supabase client or auth module missing. Critical failure.');
            return;
        }
        this.initPromise = (async () => {
            try {
                // Timeout after 5 seconds
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Init timeout')), 5000));
                const getUser = (async () => {
                    const { data: { user } } = await window.supabase.auth.getUser();
                    return user;
                })();
                
                const user = await Promise.race([getUser, timeout]);
                this.currentUser = user;
                return user;
            } catch (e) {
                console.error('TaskFlow: Failed to fetch user during init', e);
                return null;
            }
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
        try {
            const { count, error } = await window.supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.currentUser.id);
            return !error && count > 0;
        } catch (e) {
            console.error('SyncService: hasData check failed', e);
            return false;
        }
    },

    // --- PROJECTS ---
    async getProjects() {
        await this.ensureInit();
        let dbProjects = [];
        if (window.supabase && this.currentUser) {
            try {
                console.log('SyncService: Fetching projects from Supabase...');
                const { data, error } = await window.supabase
                    .from('projects')
                    .select('*')
                    .eq('user_id', this.currentUser.id);

                if (!error && data) {
                    console.log(`SyncService: Found ${data.length} projects in DB`);
                    dbProjects = data.map(p => ({
                        ...p,
                        desc: p.description
                    }));
                } else if (error) {
                    console.error('SyncService: Error fetching projects:', error);
                }
            } catch (e) {
                console.error('SyncService: Exception fetching projects:', e);
            }
        }

        // Fallback or Merge
        const local = localStorage.getItem('tf_projects');
        
        if (dbProjects.length > 0) return dbProjects;
        
        // If the user has explicitly cleared projects, local will be '[]' (length 0 but not null)
        // We only show defaults if local is null (first time user)
        if (local !== null) {
            return JSON.parse(local);
        }
        
        return [
            { id: 'p1', name: "Quantum Research", desc: "Tracking developments in superconducting qubits.", progress: 76, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800" },
            { id: 'p2', name: "Supply Chain", desc: "Redesigning routes for the 2026 peak season.", progress: 42, status: "Active", color: "orange", image_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800" }
        ];
    },

    async saveProject(project) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            console.log('SyncService: Saving project to Supabase...', project.name);
            const { error } = await window.supabase
                .from('projects')
                .upsert({
                    id: project.id,
                    name: project.name,
                    description: project.description || project.desc,
                    progress: project.progress || 0,
                    status: project.status || 'Active',
                    color: project.color || 'orange',
                    image_url: project.image_url,
                    user_id: this.currentUser.id
                });
            
            if (error) {
                console.error('SyncService: Supabase project save failed:', error);
            } else {
                console.log('SyncService: Supabase project save successful');
                // Even on success, we update local storage for perceived speed and offline fallback
            }
        }

        // Local storage update
        const projects = await this.getProjects();
        const index = projects.findIndex(p => p.id === project.id);
        if (index > -1) projects[index] = project;
        else projects.push(project);
        localStorage.setItem('tf_projects', JSON.stringify(projects));
        console.log('SyncService: Local storage projects updated');
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
        let dbTasks = [];
        if (window.supabase && this.currentUser) {
            try {
                console.log('SyncService: Fetching tasks from Supabase...');
                const { data, error } = await window.supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', this.currentUser.id);

                if (!error && data) {
                    console.log(`SyncService: Found ${data.length} tasks in DB`);
                    dbTasks = data.map(t => ({
                        ...t,
                        desc: t.description,
                        column: t.column_id,
                        estimated_time: t.estimated_time || '0h 0m',
                        time_consumed: t.time_consumed || 0,
                        attachments: t.attachments || [],
                        time_history: t.time_history || []
                    }));
                } else if (error) {
                    console.error('SyncService: Error fetching tasks:', error);
                }
            } catch (e) {
                console.error('SyncService: Exception fetching tasks:', e);
            }
        }

        // Fallback or Merge
        const local = localStorage.getItem('tf_tasks');
        const localTasks = local ? JSON.parse(local) : [];
        
        if (dbTasks.length > 0) return dbTasks;
        if (localTasks.length > 0) return localTasks;

        // Default tasks for new users
        return [
            { id: 't1', title: 'Initial Project Audit', status: 'In Progress', column: 'in-progress', priority: 'High', due: new Date().toISOString().split('T')[0] },
            { id: 't2', title: 'Stakeholder Sync', status: 'Backlog', column: 'backlog', priority: 'Medium', due: new Date().toISOString().split('T')[0] }
        ];
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
                    column: data.column_id,
                    estimated_time: data.estimated_time || '0h 0m',
                    time_consumed: data.time_consumed || 0,
                    attachments: data.attachments || [],
                    time_history: data.time_history || []
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
            console.log('SyncService: Saving task to Supabase...', task.title);
            
            // Try to find project_id from project name if project_id is missing
            let projectId = task.project_id;
            if (!projectId && task.project) {
                const projects = await this.getProjects();
                const p = projects.find(proj => proj.name === task.project);
                if (p) projectId = p.id;
            }

            const { error } = await window.supabase
                .from('tasks')
                .upsert({
                    id: task.id,
                    title: task.title,
                    description: task.desc || task.description,
                    priority: task.priority || 'Medium',
                    project: task.project,
                    project_id: projectId,
                    column_id: task.column || 'backlog',
                    status: task.status || 'Backlog',
                    due: task.due || task.due_date,
                    estimated_time: task.estimated_time || '0h 0m',
                    time_consumed: task.time_consumed || 0,
                    attachments: task.attachments || [],
                    time_history: task.time_history || [],
                    user_id: this.currentUser.id
                });
            
            if (error) {
                console.error('SyncService: Supabase task save failed:', error);
            } else {
                console.log('SyncService: Supabase task save successful');
            }
        }

        // Always update local storage
        const tasks = await this.getTasks();
        const index = tasks.findIndex(t => t.id === task.id);
        if (index > -1) tasks[index] = task;
        else tasks.push(task);
        localStorage.setItem('tf_tasks', JSON.stringify(tasks));
        console.log('SyncService: Local storage tasks updated');
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
        let dbEvents = [];
        if (window.supabase && this.currentUser) {
            try {
                console.log('SyncService: Fetching events from Supabase...');
                const { data, error } = await window.supabase
                    .from('events')
                    .select('*')
                    .eq('user_id', this.currentUser.id);

                if (!error && data) {
                    console.log(`SyncService: Found ${data.length} events in DB`);
                    dbEvents = data;
                    console.log('SyncService: Events sample:', dbEvents.slice(0, 1));
                } else if (error) {
                    console.error('SyncService: Error fetching events:', error);
                }
            } catch (e) {
                console.error('SyncService: Exception fetching events:', e);
            }
        }

        // Fallback or Merge
        const local = localStorage.getItem('tf_events');
        const localEvents = local ? JSON.parse(local) : [];
        
        if (dbEvents.length > 0) return dbEvents;
        if (localEvents.length > 0) return localEvents;

        // Default events for new users
        const today = new Date().toISOString().split('T')[0];
        return [
            { id: 'e1', title: 'Team Sync', event_date: today, color: 'orange', description: 'Daily standup' },
            { id: 'e2', title: 'Product Review', event_date: today, color: 'teal', description: 'Weekly review' }
        ];
    },

    async saveEvent(event) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            console.log('SyncService: Saving event to Supabase...', event.title);
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
            if (error) {
                console.error('SyncService: Supabase event save failed:', error);
            } else {
                console.log('SyncService: Supabase event save successful');
            }
        }

        // Always update local storage
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
        console.log('SyncService: Local storage events updated');
    },

    async deleteEvent(eventId) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            console.log('SyncService: Deleting event from Supabase...', eventId);
            const { error } = await window.supabase
                .from('events')
                .delete()
                .eq('id', eventId);
            if (error) {
                console.error('SyncService: Supabase event delete failed:', error);
            }
        }

        // Always update local storage
        const events = await this.getEvents();
        const filtered = events.filter(e => e.id !== eventId);
        localStorage.setItem('tf_events', JSON.stringify(filtered));
        console.log('SyncService: Local storage events updated (deleted)');
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

        const dummyProjects = [
            { id: crypto.randomUUID(), name: "AI Strategy 2030", description: "Department-wide LLM integration.", progress: 35, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800" },
            { id: crypto.randomUUID(), name: "Lunar Base Logistics", description: "Scheduling automated cargo transport.", progress: 12, status: "Active", color: "orange", image_url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800" },
            { id: crypto.randomUUID(), name: "Global Supply Chain", description: "Route optimization for peak seasons.", progress: 88, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800" }
        ];

        if (window.supabase && this.currentUser) {
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
        } else {
            // Local-only seeding
            localStorage.setItem('tf_projects', JSON.stringify(dummyProjects));
            
            const allTasks = [];
            for (const p of dummyProjects) {
                allTasks.push(
                    { id: crypto.randomUUID(), title: `Baseline Audit - ${p.name}`, status: 'Done', column: 'done', priority: 'High', project_id: p.id },
                    { id: crypto.randomUUID(), title: `Stakeholder Review`, status: 'In Progress', column: 'in-progress', priority: 'Medium', project_id: p.id }
                );
            }
            localStorage.setItem('tf_tasks', JSON.stringify(allTasks));

            const today = new Date();
            const dummyEvents = [
                { id: crypto.randomUUID(), title: "Strategy Deep Dive", description: "Quarterly alignment session.", event_date: today.toISOString().split('T')[0], color: "teal" },
                { id: crypto.randomUUID(), title: "Lunar Base Sync", description: "Status update on automated cargo.", event_date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], color: "orange" },
                { id: crypto.randomUUID(), title: "UX Audit Presentation", description: "Reviewing premium design enhancements.", event_date: new Date(today.getTime() + 172800000).toISOString().split('T')[0], color: "teal" }
            ];
            localStorage.setItem('tf_events', JSON.stringify(dummyEvents));
        }
    },

    async logout() {
        console.log('TaskFlow: Logout process started');
        
        // Hard-clear all local storage keys to ensure auth-guard doesn't bounce back
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes('sb-') || key.includes('supabase')) {
                    localStorage.removeItem(key);
                }
            });
            console.log('TaskFlow: Auth keys cleared from localStorage');
        } catch (e) {
            console.error('TaskFlow: Failed to clear localStorage', e);
        }

        if (window.supabase) {
            try {
                // Background signout attempt
                await window.supabase.auth.signOut();
                console.log('TaskFlow: signOut successful');
            } catch (error) {
                console.error('TaskFlow: signOut error', error);
            } finally {
                window.location.href = 'login.html';
            }
        } else {
            window.location.href = 'login.html';
        }
    }
};

window.SyncService = SyncService;
SyncService.init();
