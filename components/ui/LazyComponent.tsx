import React, { Suspense } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({ 
  children, 
  fallback 
}) => {
  return (
    <Suspense 
      fallback={fallback || (
        <div className="flex justify-center items-center p-8">
          <LoadingSpinner size="large" text="Loading component..." />
        </div>
      )}
    >
      {children}
    </Suspense>
  );
};