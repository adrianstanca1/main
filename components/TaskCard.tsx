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
    
    const dependency = useMemo(() => {
        if (!todo.dependsOn) return null;
        return allTodos.find(t => t.id === todo.dependsOn);
    }, [todo.dependsOn, allTodos]);

    const isBlocked = useMemo(() => {
        return dependency && dependency.status !== TodoStatus.DONE;
    }, [dependency]);
    
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

    const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) && todo.status !== TodoStatus.DONE;
    
    const cursorClass = canManageTasks ? (isBlocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing') : 'cursor-pointer';

    const priorityStyles = {
        [TodoPriority.HIGH]: {
            bg: 'post-it-yellow',
            rotation: '-rotate-1',
        },
        [TodoPriority.MEDIUM]: {
            bg: 'post-it-green',
            rotation: 'rotate-1',
        },
        [TodoPriority.LOW]: {
            bg: 'post-it-blue',
            rotation: '-rotate-2',
        },
    };
    
    const styles = priorityStyles[todo.priority] || priorityStyles[TodoPriority.MEDIUM];

    return (
        <div
            onClick={onSelect}
            draggable={canManageTasks && !isBlocked}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`post-it ${styles.bg} ${styles.rotation} ${cursorClass} ${isBlocked ? 'opacity-60' : ''}`}
        >
            <div className="flex justify-between items-start">
                 <p className={`text-slate-800 break-words flex-grow ${isBlocked ? 'line-through' : ''}`}>{todo.text}</p>
                 {isBlocked && (
                    <div title={`Blocked by: "${dependency?.text}"`} className="flex-shrink-0 ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>

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
            
        </div>
    );
};