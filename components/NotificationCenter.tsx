
import React from 'react';
import { Notification } from '../types';

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: () => void;
  onClear: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onClear }) => {
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
