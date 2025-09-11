import React, { useMemo } from 'react';
import { Todo, TodoStatus, TodoPriority, User } from '../types';
import { PriorityDisplay } from './ui/PriorityDisplay';
import { ReminderControl } from './ReminderControl';

interface TaskCardProps {
    todo: Todo;
    allTodos: Todo[];
    onSelect: () => void;
    canManageTasks: boolean;
    user: User;
    addToast: (message: string, type: 'success' | 'error') => void;
    onReminderUpdate: () => void;
    personnel: User[];
}

const Avatar: React.FC<{ name: string; className?: string; title?: string }> = ({ name, className = '', title }) => {
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };
    return (
        <div title={title} className={`rounded-full bg-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
            {getInitials(name)}
        </div>
    );
};


export const TaskCard: React.FC<TaskCardProps> = ({ todo, allTodos, onSelect, canManageTasks, user, addToast, onReminderUpdate, personnel }) => {
    
    const isDone = todo.status === TodoStatus.DONE;

    const dependency = useMemo(() => {
        if (!todo.dependsOn) return null;
        return allTodos.find(t => t.id === todo.dependsOn);
    }, [todo.dependsOn, allTodos]);

    const isBlocked = useMemo(() => {
        if (isDone) return false;
        return dependency && dependency.status !== TodoStatus.DONE;
    }, [dependency, isDone]);
    
    const assignee = useMemo(() => {
        if (!todo.assigneeId || !personnel) return null;
        return personnel.find(p => p.id === todo.assigneeId);
    }, [todo.assigneeId, personnel]);
    
    const statusClasses = useMemo(() => {
        if (isDone) {
            return 'opacity-50 scale-95';
        }
        
        const classes = [];
        
        if (isBlocked) {
            classes.push('opacity-60');
        } else if (todo.isOffline) {
            classes.push('opacity-75');
        }
        
        if (todo.isOffline) {
            classes.push('border-l-4 border-sky-500 pl-3');
        }
        
        return classes.join(' ');
    }, [isDone, isBlocked, todo.isOffline]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!canManageTasks || isBlocked) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('todoId', todo.id.toString());
        e.currentTarget.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        e.currentTarget.style.opacity = '1';
    };

    const isOverdue = todo.dueDate && new Date(new Date(todo.dueDate).setHours(0, 0, 0, 0)) < new Date(new Date().setHours(0, 0, 0, 0)) && !isDone;
    
    const cursorClass = canManageTasks ? (isBlocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing') : 'cursor-pointer';

    const priorityStyles = {
        [TodoPriority.HIGH]: { bg: 'post-it-yellow', rotation: '-rotate-1' },
        [TodoPriority.MEDIUM]: { bg: 'post-it-green', rotation: 'rotate-1' },
        [TodoPriority.LOW]: { bg: 'post-it-blue', rotation: '-rotate-2' },
    };
    
    const styles = priorityStyles[todo.priority] || priorityStyles[TodoPriority.MEDIUM];

    const cardTitle = useMemo(() => [
        isBlocked ? `Blocked by: "${dependency?.text}"` : '',
        todo.isOffline ? 'This task is saved locally and will sync when online.' : ''
    ].filter(Boolean).join('\n'), [isBlocked, dependency, todo.isOffline]);

    return (
        <div
            onClick={onSelect}
            draggable={canManageTasks && !isBlocked}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`post-it ${styles.bg} ${styles.rotation} ${cursorClass} transition-all duration-500 ease-in-out ${statusClasses} ${!isDone ? 'hover:scale-105' : ''} group relative`}
            title={cardTitle || undefined}
        >
            {canManageTasks && !isDone && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onSelect(); }} 
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-black/10 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Edit Task"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                    </svg>
                </button>
            )}

            <div className="flex justify-between items-start gap-2">
                <div className={`flex-grow break-words flex items-center gap-2 ${isBlocked || isDone ? 'line-through' : ''} ${isDone ? 'text-slate-500' : 'text-slate-800'}`}>
                    {!isDone && todo.isOffline && (
                        <span title="This task is saved locally and will sync when online.">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                        </span>
                    )}
                    <p>{todo.text}</p>
                </div>
                
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isBlocked && (
                       <div title={`Blocked by: "${dependency?.text}"`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                           </svg>
                       </div>
                    )}
                </div>
            </div>
            
            {!isDone && (
                 <div className="flex items-center justify-between text-xs text-gray-700 mt-3 font-sans">
                     <div className="flex items-center gap-3">
                        <ReminderControl todo={todo} user={user} onReminderUpdate={onReminderUpdate} addToast={addToast} />
                        {todo.dueDate && (
                            <div className={`font-semibold flex items-center gap-1.5 ${isOverdue ? 'text-red-700' : ''}`} title={isOverdue ? 'This task is overdue' : ''}>
                                {isOverdue && (
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <span>{new Date(todo.dueDate).toLocaleDateString()}</span>
                            </div>
                        )}
                     </div>
                    <div className="flex items-center gap-2">
                        {assignee && <Avatar name={assignee.name} className="w-6 h-6 text-xs" title={`Assigned to ${assignee.name}`} />}
                        <div className="font-semibold text-right">
                            #{typeof todo.id === 'number' ? todo.id.toString().slice(-4) : '...'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};