import React, { useState } from 'react';
import { Todo, TodoStatus, SubTask } from '../types';
import { TaskCard } from './TaskCard';
import { Button } from './ui/Button';

interface KanbanBoardProps {
    todos: Todo[];
    allTodos: Todo[];
    onUpdateTaskStatus: (todoId: number | string, newStatus: TodoStatus) => void;
    onSelectTask: (task: Todo) => void;
    onAddTask: (status: TodoStatus, text: string) => Promise<void>;
    canManageTasks: boolean;
}

interface KanbanColumnProps {
    title: string;
    status: TodoStatus;
    todos: Todo[];
    allTodos: Todo[]; // For context
    onUpdateTaskStatus: (todoId: number | string, newStatus: TodoStatus) => void;
    onSelectTask: (task: Todo) => void;
    onAddTask: (status: TodoStatus, text: string) => Promise<void>;
    canManageTasks: boolean;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, status, todos, allTodos, onUpdateTaskStatus, onSelectTask, onAddTask, canManageTasks }) => {
    const [isOver, setIsOver] = useState(false);
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Allow drop
        if (canManageTasks) {
            setIsOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsOver(false);
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!canManageTasks) return;
        setIsOver(false);
        const todoIdStr = e.dataTransfer.getData('todoId');
        // Handle both string and number IDs for offline compatibility
        const todoId = isNaN(parseInt(todoIdStr, 10)) ? todoIdStr : parseInt(todoIdStr, 10);
        const originalStatus = allTodos.find(t => t.id.toString() === todoIdStr)?.status;

        if (todoId && originalStatus !== status) {
            onUpdateTaskStatus(todoId, status);
        }
    };

    return (
        <div 
            className={`p-3 w-80 md:w-96 flex-shrink-0 flex flex-col transition-colors duration-300 ${isOver ? 'bg-sky-100/50 rounded-lg' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <h3 className="font-bold text-slate-800 text-xl mb-4 px-2 flex-shrink-0">{title} <span className="text-lg font-normal text-slate-500">({todos.length})</span></h3>
            <div className="space-y-4 min-h-[50vh] overflow-y-auto flex-grow p-1">
                {todos.map(todo => (
                    <TaskCard 
                        key={todo.id} 
                        todo={todo}
                        allTodos={allTodos}
                        onSelect={() => onSelectTask(todo)}
                        canManageTasks={canManageTasks}
                    />
                ))}
            </div>
        </div>
    );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ todos, allTodos, onUpdateTaskStatus, onSelectTask, onAddTask, canManageTasks }) => {
    const todoTasks = todos.filter(t => t.status === TodoStatus.TODO);
    const inProgressTasks = todos.filter(t => t.status === TodoStatus.IN_PROGRESS);
    const doneTasks = todos
        .filter(t => t.status === TodoStatus.DONE)
        .sort((a, b) => {
            // Sort by completion date, with nulls (older tasks without the field) first.
            const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return dateA - dateB;
        });
    
    return (
        <div className="whiteboard-bg flex gap-6 overflow-x-auto pb-4">
            <KanbanColumn 
                title="To Do"
                status={TodoStatus.TODO}
                todos={todoTasks}
                allTodos={allTodos}
                onUpdateTaskStatus={onUpdateTaskStatus}
                onSelectTask={onSelectTask}
                onAddTask={onAddTask}
                canManageTasks={canManageTasks}
            />
            <KanbanColumn 
                title="In Progress"
                status={TodoStatus.IN_PROGRESS}
                todos={inProgressTasks}
                allTodos={allTodos}
                onUpdateTaskStatus={onUpdateTaskStatus}
                onSelectTask={onSelectTask}
                onAddTask={onAddTask}
                canManageTasks={canManageTasks}
            />
            <KanbanColumn 
                title="Done"
                status={TodoStatus.DONE}
                todos={doneTasks}
                allTodos={allTodos}
                onUpdateTaskStatus={onUpdateTaskStatus}
                onSelectTask={onSelectTask}
                onAddTask={onAddTask}
                canManageTasks={canManageTasks}
            />
        </div>
    );
};