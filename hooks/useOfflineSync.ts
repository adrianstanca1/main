import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/mockApi';
import { Todo, Comment } from '../types';

// Define the shape of an offline action
type OfflineActionType = 'ADD_TODO' | 'UPDATE_TODO' | 'UPLOAD_DOCUMENT' | 'ADD_COMMENT';
export interface OfflineAction {
    type: OfflineActionType;
    payload: any;
    timestamp: number;
    projectId: number;
}

const PENDING_ACTIONS_KEY = 'constructflow_pending_actions';

// --- LocalStorage Helper Functions ---

const getPendingActions = (): OfflineAction[] => {
    try {
        const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        // If parsing fails, return empty array to prevent app crash
        return [];
    }
};

const savePendingActions = (actions: OfflineAction[]) => {
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
};

export const queueAction = (action: Omit<OfflineAction, 'timestamp'>) => {
    const newAction: OfflineAction = { ...action, timestamp: Date.now() };
    const actions = getPendingActions();
    actions.push(newAction);
    savePendingActions(actions);
};

export const getCachedTasks = (projectId: number): Todo[] | null => {
     try {
        const stored = localStorage.getItem(`constructflow_tasks_${projectId}`);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

export const cacheTasks = (projectId: number, tasks: Todo[]) => {
     localStorage.setItem(`constructflow_tasks_${projectId}`, JSON.stringify(tasks));
}

// --- The Main Hook ---

export const useOfflineSync = (addToast: (message: string, type: 'success' | 'error') => void) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    const syncActions = useCallback(async () => {
        if (!navigator.onLine || isSyncing) {
            return;
        }

        let pendingActions = getPendingActions();
        if (pendingActions.length === 0) {
            return;
        }

        setIsSyncing(true);
        addToast(`Syncing ${pendingActions.length} offline changes...`, 'success');

        const remainingActions: OfflineAction[] = [];
        let successCount = 0;
        
        // This map will track offline IDs to the new online IDs during a sync session
        const idMap = new Map<string, number>();

        for (const action of pendingActions) {
            try {
                switch (action.type) {
                    case 'ADD_TODO':
                        const newTodo = await api.addTodo(action.payload.taskData, action.payload.taskData.creatorId);
                        // Map the temporary offline ID to the new permanent ID from the server
                        idMap.set(action.payload.tempId, newTodo.id as number);
                        break;
                    case 'UPDATE_TODO':
                        if (typeof action.payload.id === 'number') {
                             await api.updateTodo(action.payload.id, action.payload.updates, action.payload.actorId);
                        }
                        break;
                    case 'UPLOAD_DOCUMENT':
                        await api.uploadOfflineDocument(action.payload.docData, action.payload.fileData, action.payload.docData.creatorId);
                        break;
                    case 'ADD_COMMENT':
                        let todoId = action.payload.todoId;
                        // If the comment was for an offline task, use the newly created ID
                        if (typeof todoId === 'string' && idMap.has(todoId)) {
                            todoId = idMap.get(todoId)!;
                        }
                        await api.addComment(todoId, action.payload.text, action.payload.creatorId);
                        break;
                }
                successCount++;
            } catch (error) {
                console.error('Failed to sync action:', action, error);
                remainingActions.push(action);
            }
        }
        
        savePendingActions(remainingActions);
        setIsSyncing(false);

        if (successCount > 0) {
            if (remainingActions.length === 0) {
                addToast('All offline changes have been synced!', 'success');
            } else {
                addToast(`Successfully synced ${successCount} changes. Some failed and will be retried.`, 'error');
            }
            // Notify the app that data has changed and a refresh is needed.
            window.dispatchEvent(new CustomEvent('datachanged'));
        }
        
    }, [addToast, isSyncing]);
    
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            addToast("You are back online.", 'success');
            syncActions();
        };

        const handleOffline = () => {
            setIsOnline(false);
            addToast("You are currently offline. Changes will be saved locally.", 'error');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if(navigator.onLine && getPendingActions().length > 0) {
            syncActions();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline',handleOffline);
        };
    }, [addToast, syncActions]);

    return { isOnline, isSyncing };
};