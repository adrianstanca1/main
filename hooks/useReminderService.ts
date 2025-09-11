import { useEffect, useRef } from 'react';
import { api } from '../services/mockApi';
import { Project, Role, Todo, User } from '../types';

const STORAGE_KEY = 'constructflow_triggered_reminders';
const CHECK_INTERVAL = 30 * 1000; // 30 seconds
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Helper to get triggered reminder IDs from localStorage
const getTriggeredIds = (): Set<number> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
        console.error("Failed to parse triggered reminders from localStorage", error);
        return new Set();
    }
};

// Helper to save triggered reminder IDs to localStorage
const saveTriggeredIds = (ids: Set<number>) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch (error) {
        console.error("Failed to save triggered reminders to localStorage", error);
    }
};

export const useReminderService = (user: User | null) => {
    const tasksRef = useRef<Map<string | number, Todo>>(new Map());
    const projectsRef = useRef<Map<number, Project>>(new Map());
    
    useEffect(() => {
        if (!user) {
            return; // No user, do nothing.
        }

        const fetchAllDataForUser = async () => {
            console.log('ReminderService: Fetching tasks...');
            try {
                let projects: Project[] = [];
                if (user.role === Role.PM) {
                    projects = await api.getProjectsByManager(user.id);
                } else {
                    projects = await api.getProjectsByUser(user.id);
                }

                const projectMap = new Map<number, Project>();
                projects.forEach(p => projectMap.set(p.id, p));
                projectsRef.current = projectMap;

                const allTasks = (await Promise.all(
                    projects.map(p => api.getTodosByProject(p.id))
                )).flat();

                const taskMap = new Map<string | number, Todo>();
                allTasks.forEach(t => {
                    taskMap.set(t.id, t);
                });
                tasksRef.current = taskMap;
                
            } catch (error) {
                console.error("ReminderService: Failed to fetch data", error);
            }
        };

        const checkReminders = () => {
            if (document.hidden) {
                // Don't show notifications if the tab isn't active, to avoid being spammy.
                // Could be changed if notifications are desired even when user is away.
                // For this app, we assume they see reminders when they are active.
                // A better approach for critical reminders might be service workers.
                return;
            }

            const now = Date.now();
            const triggeredIds = getTriggeredIds();
            const tasks = Array.from(tasksRef.current.values());
            
            tasks.forEach(task => {
                // FIX: Add a type guard to ensure the task ID is a number before using it with the Set of triggered IDs.
                if (typeof task.id === 'number' && task.reminderAt && !triggeredIds.has(task.id)) {
                    const reminderTime = new Date(task.reminderAt).getTime();
                    // Trigger if the reminder time is in the past
                    if (reminderTime <= now) {
                        const project = projectsRef.current.get(task.projectId);
                        const title = `Task Reminder: ${task.text}`;
                        const options = {
                            body: `Due soon for project: ${project?.name || 'Unknown Project'}.`,
                            icon: '/favicon.svg', // Optional: Add an icon
                        };
                        
                        // Use the Notification API
                        new Notification(title, options);
                        
                        // Mark as triggered
                        // FIX: Ensure the task ID is a number before adding it to the numeric Set.
                        triggeredIds.add(task.id);
                    }
                }
            });

            saveTriggeredIds(triggeredIds);
        };
        
        const requestNotificationPermission = async () => {
             if (!('Notification' in window)) {
                console.log("This browser does not support desktop notification");
            } else if (Notification.permission === "default") {
                await Notification.requestPermission();
            }
        };

        // --- Setup intervals ---
        requestNotificationPermission();
        fetchAllDataForUser(); // Initial fetch

        const fetchIntervalId = setInterval(fetchAllDataForUser, FETCH_INTERVAL);
        const checkIntervalId = setInterval(checkReminders, CHECK_INTERVAL);

        return () => {
            clearInterval(fetchIntervalId);
            clearInterval(checkIntervalId);
        };

    }, [user]); // Re-initialize when the user logs in/out
};