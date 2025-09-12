import React from 'react';
import { useNotifications, Notification } from '../hooks/useNotifications';

const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const { removeNotification } = useNotifications();

  const getStyles = () => {
    const baseStyles = "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5";
    const borderStyles = {
      success: "border-l-4 border-green-400",
      error: "border-l-4 border-red-400", 
      warning: "border-l-4 border-yellow-400",
      info: "border-l-4 border-blue-400"
    };
    return `${baseStyles} ${borderStyles[notification.type]}`;
  };

  const getIcon = () => {
    const icons = {
      success: "✅",
      error: "❌", 
      warning: "⚠️",
      info: "ℹ️"
    };
    return icons[notification.type];
  };

  return (
    <div className={`${getStyles()} animate-slide-in`}>
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-lg">{getIcon()}</span>
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {notification.message}
            </p>
            {notification.action && (
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={notification.action.onClick}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {notification.action.label}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex border-l border-gray-200">
        <button
          onClick={() => removeNotification(notification.id)}
          className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export const NotificationContainer: React.FC = () => {
  const { notifications } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </div>
  );
};