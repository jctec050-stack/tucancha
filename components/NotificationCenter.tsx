
import React from 'react';
import { Notification } from '../types';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: () => void;
  onClear: () => void;
  userId?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onClear, userId }) => {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications(userId);

  return (
    <div className="fixed top-16 left-4 right-4 md:absolute md:top-full md:right-0 md:left-auto md:w-80 md:mx-0 bg-white shadow-2xl rounded-xl border border-gray-100 z-50 overflow-hidden mt-2">
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <h3 className="font-bold">Notificaciones</h3>
        <div className="flex gap-2">
          <button onClick={onClear} className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30 transition">Limpiar</button>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      
      {/* Push Notification Toggle */}
      {isSupported && userId && (
        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${isSubscribed ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>
                <span className="text-xs font-medium text-indigo-900">
                    {isSubscribed ? 'Notificaciones activas' : 'Activar notificaciones'}
                </span>
            </div>
            <button 
                onClick={isSubscribed ? unsubscribe : subscribe}
                disabled={isLoading}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isSubscribed ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
                <span
                    className={`${isSubscribed ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                />
            </button>
        </div>
      )}

      <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No tienes notificaciones nuevas</div>
        ) : (
          notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(notif => (
            <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition">
              <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
              <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
              <p className="text-[10px] text-gray-400 mt-2">
                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
