import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-lg border p-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
  </div>
);

export const SkeletonText: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`h-4 bg-gray-200 rounded animate-pulse ${className}`}></div>
);