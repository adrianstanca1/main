import React, { useState, useRef, useEffect } from 'react';
import { Todo, User } from '../types';
import { api } from '../services/mockApi';

interface ReminderControlProps {
    todo: Todo;
    user: User;
    onReminderUpdate: () => void;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const ReminderControl: React.FC<ReminderControlProps> = ({ todo, user, onReminderUpdate, addToast }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isPopoverOpen &&
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPopoverOpen]);

    if (!todo.dueDate) {
        return null; // Can't set reminders without a due date
    }

    const handleSetReminder = async (reminderDate: Date | undefined) => {
        // FIX: Add a guard to prevent API calls for offline tasks which have string IDs.
        if (typeof todo.id !== 'number') {
            addToast('Cannot set reminders for offline tasks.', 'error');
            setIsPopoverOpen(false);
            return;
        }
        try {
            await api.updateTodoReminder(todo.id, reminderDate, user.id);
            addToast(reminderDate ? 'Reminder set successfully.' : 'Reminder cleared.', 'success');
            onReminderUpdate();
        } catch (error) {
            addToast('Failed to update reminder.', 'error');
        } finally {
            setIsPopoverOpen(false);
        }
    };

    const dueDate = new Date(todo.dueDate);

    const reminderOptions = [
        {
            label: 'On due date',
            date: new Date(new Date(dueDate).setHours(9, 0, 0, 0)), // 9 AM on the due date
        },
        {
            label: '1 hour before',
            date: new Date(dueDate.getTime() - 60 * 60 * 1000),
        },
        {
            label: '1 day before',
            date: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000),
        },
    ].filter(option => option.date.getTime() > Date.now()); // Only show future reminder options

    const hasReminder = !!todo.reminderAt;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsPopoverOpen(prev => !prev);
                }}
                title={hasReminder ? `Reminder set for ${new Date(todo.reminderAt!).toLocaleString()}` : 'Set a reminder'}
                className={`p-1 rounded-full hover:bg-slate-200 transition-colors ${hasReminder ? 'text-sky-600' : 'text-slate-400'}`}
                aria-haspopup="true"
                aria-expanded={isPopoverOpen}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
            </button>

            {isPopoverOpen && (
                <div
                    ref={popoverRef}
                    className="absolute z-10 right-0 mt-2 w-48 bg-white rounded-md shadow-lg border p-2"
                    role="menu"
                >
                    <p className="text-xs font-bold text-slate-600 px-2 pb-1 border-b mb-1">Set Reminder</p>
                    <ul className="space-y-1">
                        {reminderOptions.map(option => (
                            <li key={option.label}>
                                <button
                                    onClick={() => handleSetReminder(option.date)}
                                    className="w-full text-left text-sm px-2 py-1 rounded hover:bg-slate-100"
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                        {hasReminder && (
                             <li>
                                <button
                                    onClick={() => handleSetReminder(undefined)}
                                    className="w-full text-left text-sm px-2 py-1 rounded text-red-600 hover:bg-red-50"
                                >
                                    Clear Reminder
                                </button>
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};