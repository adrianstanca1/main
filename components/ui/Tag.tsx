import React from 'react';

interface TagProps {
  label: string;
  color?: 'green' | 'blue' | 'red' | 'gray' | 'yellow';
}

export const Tag: React.FC<TagProps> = ({ label, color = 'gray' }) => {
    const colorClasses = {
        green: 'bg-green-100 text-green-800',
        blue: 'bg-blue-100 text-blue-800',
        red: 'bg-red-100 text-red-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        gray: 'bg-slate-100 text-slate-800',
    };

    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses[color]}`}>
            {label}
        </span>
    );
};
