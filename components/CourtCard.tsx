import React from 'react';
import { Court } from '../types';

interface CourtCardProps {
    court: Court;
    isSelected: boolean;
    onSelect: () => void;
}

export const CourtCard: React.FC<CourtCardProps> = ({ court, isSelected, onSelect }) => {
    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-PY').format(num);
    };

    return (
        <button
            onClick={onSelect}
            className={`group relative w-full h-40 rounded-2xl overflow-hidden transition-all duration-300 text-left 
                ${isSelected
                    ? 'ring-4 ring-indigo-500 shadow-xl scale-[1.02]'
                    : 'hover:shadow-lg hover:scale-[1.01] border border-gray-100'
                }`}
        >
            {/* Background Image or Gradient */}
            <div className="absolute inset-0 bg-gray-200">
                {court.image_url ? (
                    <img
                        src={court.image_url}
                        alt={court.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${court.type === 'Padel' ? 'from-indigo-600 to-purple-700' : 'from-orange-400 to-red-500'}`}>
                        {/* Fallback pattern/icon could go here */}
                    </div>
                )}
            </div>

            {/* Dark Gradient Overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full p-4 text-white">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-200 transition-colors">
                        {court.name}
                    </h3>
                    <p className="text-sm font-medium text-gray-300">
                        {court.type}
                    </p>
                </div>
            </div>

            {/* Price Tag Badge */}
            <div className="absolute bottom-4 right-4 bg-indigo-500 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg group-hover:bg-indigo-600 transition-colors">
                Gs. {formatNumber(court.price_per_hour)}
            </div>

            {/* Selection Indicator (Icon) */}
            {isSelected && (
                <div className="absolute top-3 right-3 bg-indigo-500 text-white p-1 rounded-full shadow-lg animate-in fade-in zoom-in duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </button>
    );
};
