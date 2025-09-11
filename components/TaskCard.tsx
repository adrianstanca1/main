import React, { useMemo } from 'react';
import { Todo, TodoStatus, TodoPriority } from '../types';
import { PriorityDisplay } from './ui/PriorityDisplay';

interface TaskCardProps {
    todo: Todo;
    allTodos: Todo[];
    onSelect: () => void;
    canManageTasks: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ todo, allTodos, onSelect, canManageTasks }) => {
    
    const isDone = todo.status === TodoStatus.DONE;

    const dependency = useMemo(() => {
        if (!todo.dependsOn) return null;
        return allTodos.find(t => t.id === todo.dependsOn);
    }, [todo.dependsOn, allTodos]);

    const isBlocked = useMemo(() => {
        if (isDone) return false;
        return dependency && dependency.status !== TodoStatus.DONE;
    }, [dependency, isDone]);
    
    // Refactored to consolidate all state-based styling logic for better clarity and maintainability.
    const statusClasses = useMemo(() => {
        if (isDone) {
            // "Done" state takes precedence over all other visual states.
            return 'opacity-50 scale-95';
        }
        
        const classes = [];
        
        // Blocked state is the most visually muted.
        if (isBlocked) {
            classes.push('opacity-60');
        } else if (todo.isOffline) {
            // Offline state has a slight opacity reduction if not blocked.
            classes.push('opacity-75');
        }
        
        // The offline border and padding are applied regardless of blocked status (unless done).
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
            className={`post-it ${styles.bg} ${styles.rotation} ${cursorClass} transition-all duration-500 ease-in-out ${statusClasses} ${!isDone ? 'hover:scale-105' : ''}`}
            title={cardTitle || undefined}
        >
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
                
                {/* Grouped status icons for a cleaner layout */}
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
                     {todo.dueDate && (
                        <div className={`font-semibold ${isOverdue ? 'text-red-700' : ''}`}>
                            Due: {new Date(todo.dueDate).toLocaleDateString()}
                        </div>
                    )}
                    <div className="font-semibold text-right">
                        #{typeof todo.id === 'number' ? todo.id.toString().slice(-4) : '...'}
                    </div>
                </div>
            )}
        </div>
    );
};