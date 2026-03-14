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

    async logActivity(action, details) {
        await this.ensureInit();
        const activity = {
            id: 'act-' + Date.now(),
            action,
            details,
            time: new Date().toISOString(),
            user_id: this.currentUser?.id
        };
        if (window.supabase) {
            await window.supabase.from('activity_log').insert(activity);
        }
        const local = localStorage.getItem('tf_activity');
        let logs = local ? JSON.parse(local) : [];
        logs.unshift(activity);
        localStorage.setItem('tf_activity', JSON.stringify(logs.slice(0, 50)));
    },

    async getActivityLog() {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { data } = await window.supabase.from('activity_log').select('*').order('time', { ascending: false }).limit(20);
            if (data) return data;
        }
        const local = localStorage.getItem('tf_activity');
        return local ? JSON.parse(local) : [
            { id: '1', action: 'Member Invited', details: 'Sarah Miller joined the organization', time: new Date().toISOString() },
            { id: '2', action: 'Role Changed', details: 'James Chen promoted to Admin', time: new Date(Date.now() - 3600000).toISOString() }
        ];
    },

    updateLinks() {
        document.querySelectorAll('a[href="members.html"]').forEach(a => {
            a.href = 'settings-access.html';
            if (a.innerHTML.includes('Team')) a.innerHTML = a.innerHTML.replace('Team', 'Access Control');
        });
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
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        desc: t.description,
                        priority: t.priority,
                        project: t.project,
                        project_id: t.project_id,
                        assignee_id: t.assignee_id,
                        column_id: t.column_id,
                        column: t.column_id,
                        status: t.status,
                        due: t.due,
                        estimated_time: t.estimated_time || '0h 0m',
                        time_consumed: t.time_consumed || 0,
                        attachments: t.attachments || [],
                        time_history: t.time_history || [],
                        user_id: t.user_id
                    }));
                } else if (error) {
                    console.error('SyncService: Error fetching tasks:', error);
                }
            } catch (e) {
                console.error('SyncService: Exception fetching tasks:', e);
            }
        }

        // Merge and deduplicate by ID
        const local = localStorage.getItem('tf_tasks');
        const localTasks = local ? JSON.parse(local) : [];
        
        // Create a Map for deduplication, with DB tasks taking priority for synced state
        // but local tasks taking priority for unsynced changes.
        const taskMap = new Map();
        
        // Strategy: 
        // 1. Put DB tasks in first.
        // 2. Put local tasks in. If ID matches, the local task OVERWRITES the DB task.
        // This is important because local storage has the LATEST state (e.g. moved column) 
        // before the DB has finished syncing.
        
        dbTasks.forEach(t => taskMap.set(t.id, t));
        
        localTasks.forEach(lt => {
            // If it's already in DB, we overwrite with local state IF it hasn't been synced yet
            // or if we just want to ensure the UI is snappy.
            // For now, let's always let local override DB to ensure "moving" works instantly.
            if (taskMap.has(lt.id)) {
                taskMap.set(lt.id, { ...taskMap.get(lt.id), ...lt });
            } else {
                // Completely new local task
                taskMap.set(lt.id, lt);
            }
        });

        let merged = Array.from(taskMap.values());

        // Final cleanup: ensure user_id is set if logged in
        if (this.currentUser) {
            merged = merged.filter(t => !t.user_id || t.user_id === this.currentUser.id);
            // Deduplicate one last time just in case of weirdness
            const unique = [];
            const seen = new Set();
            for (const t of merged) {
                if (!seen.has(t.id)) {
                    unique.push(t);
                    seen.add(t.id);
                }
            }
            merged = unique;
            localStorage.setItem('tf_tasks', JSON.stringify(merged));
        }
 else {
            // Not logged in, use local completely
            merged = localTasks;
        }

        return merged;
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
                    id: data.id,
                    title: data.title,
                    description: data.description,
                    desc: data.description,
                    priority: data.priority,
                    project: data.project,
                    project_id: data.project_id,
                    assignee_id: data.assignee_id,
                    column_id: data.column_id,
                    column: data.column_id,
                    status: data.status,
                    due: data.due,
                    estimated_time: data.estimated_time || '0h 0m',
                    time_consumed: data.time_consumed || 0,
                    attachments: data.attachments || [],
                    time_history: data.time_history || [],
                    user_id: data.user_id
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

            let { error } = await window.supabase
                .from('tasks')
                .upsert({
                    id: task.id,
                    title: task.title,
                    description: task.desc || task.description,
                    priority: task.priority || 'Medium',
                    project: task.project && task.project.length > 20 ? undefined : task.project, // Avoid saving ID as name
                    project_id: projectId,
                    assignee_id: task.assignee_id,
                    column_id: task.column || 'backlog',
                    status: task.status || 'Backlog',
                    due: task.due || task.due_date,
                    estimated_time: task.estimated_time || '0h 0m',
                    time_consumed: task.time_consumed || 0,
                    attachments: task.attachments || [],
                    time_history: task.time_history || [],
                    user_id: this.currentUser.id
                });
            
            // Safe retry if assignee_id is missing in DB
            if (error && error.code === 'PGRST204' && error.message.includes('assignee_id')) {
                console.warn('SyncService: assignee_id column missing, retrying safe save');
                const { error: retryError } = await window.supabase
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
                error = retryError;
            }

            if (error) {
                console.error('SyncService: Supabase task save failed:', error);
            } else {
                console.log('SyncService: Supabase task save successful');
            }
        }

        // Update local storage carefully
        const local = localStorage.getItem('tf_tasks');
        let tasks = local ? JSON.parse(local) : [];
        const index = tasks.findIndex(t => t.id === task.id);
        if (index > -1) {
            tasks[index] = { ...tasks[index], ...task };
        } else {
            tasks.push(task);
        }
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

        // Update local storage carefully
        const local = localStorage.getItem('tf_tasks');
        if (local) {
            let tasks = JSON.parse(local);
            tasks = tasks.filter(t => t.id !== taskId);
            localStorage.setItem('tf_tasks', JSON.stringify(tasks));
        }
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

    // --- ASSIGNEES (TEAM MEMBERS) ---
    async getAssignees() {
        await this.ensureInit();
        let dbAssignees = [];
        if (window.supabase && this.currentUser) {
            try {
                const { data, error } = await window.supabase
                    .from('assignees')
                    .select('*')
                    .eq('user_id', this.currentUser.id);
                if (!error && data) dbAssignees = data;
            } catch (e) {
                console.error('SyncService: Error fetching assignees:', e);
            }
        }

        const local = localStorage.getItem('tf_assignees');
        const localAssignees = local ? JSON.parse(local) : [];
        
        const assigneeMap = new Map();
        
        // Strategy: Link current user to their assignees
        dbAssignees.forEach(a => assigneeMap.set(a.id, a));
        
        localAssignees.forEach(la => {
            if (assigneeMap.has(la.id)) {
                assigneeMap.set(la.id, { ...assigneeMap.get(la.id), ...la });
            } else {
                assigneeMap.set(la.id, la);
            }
        });

        let merged = Array.from(assigneeMap.values());
        
        if (this.currentUser) {
            merged = merged.filter(a => !a.user_id || a.user_id === this.currentUser.id);
            localStorage.setItem('tf_assignees', JSON.stringify(merged));
        }

        if (merged.length > 0) return merged;

        // Default assignees
        return [
            { id: 'asm-1', name: 'Sarah Miller', role: 'Design Lead', avatar_url: 'https://ui-avatars.com/api/?name=Sarah+Miller&background=rose&color=fff' },
            { id: 'asm-2', name: 'James Chen', role: 'Fullstack Dev', avatar_url: 'https://ui-avatars.com/api/?name=James+Chen&background=teal&color=fff' }
        ];
    },

    async saveAssignee(assignee) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase
                .from('assignees')
                .upsert({
                    ...assignee,
                    user_id: this.currentUser.id
                });
        }
        
        // Strictly update local cache with the new data
        const local = localStorage.getItem('tf_assignees');
        let assignees = local ? JSON.parse(local) : [];
        const index = assignees.findIndex(a => a.id === assignee.id);
        if (index > -1) {
            assignees[index] = { ...assignees[index], ...assignee };
        } else {
            assignees.push(assignee);
        }
        localStorage.setItem('tf_assignees', JSON.stringify(assignees));
    },

    async deleteAssignee(id) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase.from('assignees').delete().eq('id', id);
        }
        
        const local = localStorage.getItem('tf_assignees');
        if (local) {
            let assignees = JSON.parse(local);
            assignees = assignees.filter(a => a.id !== id);
            localStorage.setItem('tf_assignees', JSON.stringify(assignees));
        }
    },

    async getProjectMembersDetail(projectId) {
        await this.ensureInit();
        let dbData = [];
        if (window.supabase && this.currentUser) {
            try {
                const { data } = await window.supabase
                    .from('project_members')
                    .select('*, assignees(*)')
                    .eq('project_id', projectId);
                if (data) dbData = data;
            } catch (e) {
                console.error('Error fetching project members:', e);
            }
        }

        // Local fallback
        const localIds = localStorage.getItem(`tf_pm_${projectId}`);
        if (!dbData.length && localIds) {
            const ids = JSON.parse(localIds);
            const allAssignees = await this.getAssignees();
            return ids.map(id => {
                const assignee = allAssignees.find(a => a.id === id);
                // Return structure matching Supabase join
                return {
                    project_id: projectId,
                    assignee_id: id,
                    role: assignee?.role || 'Member', // This is their ORG role as fallback
                    assignees: assignee
                };
            });
        }
        
        return dbData;
    },

    // --- WORKSTATIONS ---
    async getWorkstations() {
        await this.ensureInit();
        let dbWorkstations = [];
        if (window.supabase && this.currentUser) {
            try {
                const { data, error } = await window.supabase
                    .from('workstations')
                    .select('*')
                    .eq('user_id', this.currentUser.id);
                if (!error && data) dbWorkstations = data;
            } catch (e) {
                console.error('SyncService: Error fetching workstations:', e);
            }
        }

        const local = localStorage.getItem('tf_workstations');
        const localWorkstations = local ? JSON.parse(local) : [];
        
        const workstationMap = new Map();
        dbWorkstations.forEach(w => workstationMap.set(w.id, w));
        localWorkstations.forEach(lw => {
            if (workstationMap.has(lw.id)) {
                workstationMap.set(lw.id, { ...workstationMap.get(lw.id), ...lw });
            } else {
                workstationMap.set(lw.id, lw);
            }
        });

        let merged = Array.from(workstationMap.values());
        if (this.currentUser) {
            merged = merged.filter(w => !w.user_id || w.user_id === this.currentUser.id);
            localStorage.setItem('tf_workstations', JSON.stringify(merged));
        }

        if (merged.length > 0) return merged;

        // Default workstation
        return [{ id: 'ws-default', name: 'Main Workspace', user_id: this.currentUser?.id, created_at: new Date().toISOString() }];
    },

    async saveWorkstation(ws) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase
                .from('workstations')
                .upsert({ ...ws, user_id: this.currentUser.id });
        }
        const local = localStorage.getItem('tf_workstations');
        let workstations = local ? JSON.parse(local) : [];
        const index = workstations.findIndex(w => w.id === ws.id);
        if (index > -1) workstations[index] = { ...workstations[index], ...ws };
        else workstations.push(ws);
        localStorage.setItem('tf_workstations', JSON.stringify(workstations));
    },

    // --- ROLES & PERMISSIONS ---
    async getRolesAndPermissions() {
        // Simulated default roles and permissions
        return [
            { 
                role: 'Owner', 
                permissions: { 
                    create_project: true, edit_project: true, delete_project: true, 
                    manage_users: true, invite_members: true, view_content: true, manage_billing: true 
                } 
            },
            { 
                role: 'Admin', 
                permissions: { 
                    create_project: true, edit_project: true, delete_project: true, 
                    manage_users: true, invite_members: true, view_content: true, manage_billing: false 
                } 
            },
            { 
                role: 'Manager', 
                permissions: { 
                    create_project: true, edit_project: true, delete_project: false, 
                    manage_users: false, invite_members: true, view_content: true, manage_billing: false 
                } 
            },
            { 
                role: 'Member', 
                permissions: { 
                    create_project: false, edit_project: false, delete_project: false, 
                    manage_users: false, invite_members: false, view_content: true, manage_billing: false 
                } 
            },
            { 
                role: 'Viewer', 
                permissions: { 
                    create_project: false, edit_project: false, delete_project: false, 
                    manage_users: false, invite_members: false, view_content: true, manage_billing: false 
                } 
            }
        ];
    },

    async getProjectMembers(projectId) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            const { data } = await window.supabase
                .from('project_members')
                .select('assignee_id')
                .eq('project_id', projectId);
            return data ? data.map(d => d.assignee_id) : [];
        }
        const local = localStorage.getItem(`tf_pm_${projectId}`);
        return local ? JSON.parse(local) : [];
    },

    async updateProjectMembers(projectId, assigneeIds) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase.from('project_members').delete().eq('project_id', projectId);
            const members = assigneeIds.map(aid => ({
                project_id: projectId,
                assignee_id: aid,
                user_id: this.currentUser.id,
                role: 'Member'
            }));
            if (members.length > 0) {
                await window.supabase.from('project_members').insert(members);
            }
        }
        localStorage.setItem(`tf_pm_${projectId}`, JSON.stringify(assigneeIds));
    },

    async addProjectMember(projectId, assigneeId, role = 'Member') {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase.from('project_members').upsert({
                project_id: projectId,
                assignee_id: assigneeId,
                user_id: this.currentUser.id,
                role: role
            });
        }
        const local = localStorage.getItem(`tf_pm_${projectId}`);
        let ids = local ? JSON.parse(local) : [];
        if (!ids.includes(assigneeId)) {
            ids.push(assigneeId);
            localStorage.setItem(`tf_pm_${projectId}`, JSON.stringify(ids));
        }
    },

    async removeProjectMember(projectId, assigneeId) {
        await this.ensureInit();
        if (window.supabase && this.currentUser) {
            await window.supabase.from('project_members')
                .delete()
                .eq('project_id', projectId)
                .eq('assignee_id', assigneeId);
        }
        const local = localStorage.getItem(`tf_pm_${projectId}`);
        if (local) {
            let ids = JSON.parse(local);
            ids = ids.filter(id => id !== assigneeId);
            localStorage.setItem(`tf_pm_${projectId}`, JSON.stringify(ids));
        }
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

        // Use stable IDs to avoid duplicates if seeded multiple times
        const dummyProjects = [
            { id: 'proj-seed-1', name: "AI Strategy 2030", description: "Department-wide LLM integration.", progress: 35, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800" },
            { id: 'proj-seed-2', name: "Lunar Base Logistics", description: "Scheduling automated cargo transport.", progress: 12, status: "Active", color: "orange", image_url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=800" },
            { id: 'proj-seed-3', name: "Global Supply Chain", description: "Route optimization for peak seasons.", progress: 88, status: "Active", color: "teal", image_url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=800" }
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
                    { id: `task-seed-1-${p.id}`, title: `Baseline Audit - ${p.name}`, status: 'Done', column_id: 'done', priority: 'High' },
                    { id: `task-seed-2-${p.id}`, title: `Stakeholder Review`, status: 'In Progress', column_id: 'in-progress', priority: 'Medium' },
                    { id: `task-seed-3-${p.id}`, title: `Final Release Candidate`, status: 'Backlog', column_id: 'backlog', priority: 'Low' }
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

            // Create some team members
            const sarah = { id: crypto.randomUUID(), name: 'Elena Vance', role: 'Security Specialist', email: 'elena@resistance.com', avatar_url: 'https://ui-avatars.com/api/?name=Elena+Vance&background=6366f1&color=fff' };
            const ghost = { id: crypto.randomUUID(), name: 'Simon Riley', role: 'Field Operative', email: 'ghost@taskforce.com', avatar_url: 'https://ui-avatars.com/api/?name=Simon+Riley&background=020617&color=fff' };
            
            await this.saveAssignee(sarah);
            await this.saveAssignee(ghost);

            // Assign to first project
            if (dummyProjects[0]) {
                await this.updateProjectMembers(dummyProjects[0].id, [sarah.id, ghost.id]);
            }
        } else {
            // Local-only seeding
            localStorage.setItem('tf_projects', JSON.stringify(dummyProjects));
            
            const allTasks = [];
            for (const p of dummyProjects) {
                allTasks.push(
                    { id: `task-seed-1-${p.id}`, title: `Baseline Audit - ${p.name}`, status: 'Done', column: 'done', priority: 'High', project_id: p.id },
                    { id: `task-seed-2-${p.id}`, title: `Stakeholder Review`, status: 'In Progress', column: 'in-progress', priority: 'Medium', project_id: p.id }
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

            // Create some team members
            const sarah = { id: crypto.randomUUID(), name: 'Elena Vance', role: 'Security Specialist', email: 'elena@resistance.com', avatar_url: 'https://ui-avatars.com/api/?name=Elena+Vance&background=6366f1&color=fff' };
            const ghost = { id: crypto.randomUUID(), name: 'Simon Riley', role: 'Field Operative', email: 'ghost@taskforce.com', avatar_url: 'https://ui-avatars.com/api/?name=Simon+Riley&background=020617&color=fff' };
            
            localStorage.setItem('tf_assignees', JSON.stringify([sarah, ghost]));
            if (dummyProjects[0]) {
                localStorage.setItem(`tf_pm_${dummyProjects[0].id}`, JSON.stringify([sarah.id, ghost.id]));
            }
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
