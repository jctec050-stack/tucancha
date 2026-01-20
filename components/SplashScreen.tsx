'use client';

import React from 'react';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    React.useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 2500); // Show splash for 2.5 seconds

        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white via-blue-50 to-orange-50">
            <div className="relative animate-fade-in-scale">
                {/* Logo Container with Animation */}
                <div className="relative w-96 h-96 flex items-center justify-center">
                    <img
                        src="/logo.png"
                        alt="TuCancha Logo"
                        className="object-contain animate-float w-full h-full"
                        style={{
                            filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.15))'
                        }}
                    />
                </div>

                {/* Loading Indicator */}
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-sm font-semibold text-gray-600 animate-pulse">Cargando...</p>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in-scale {
                    0% {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .animate-fade-in-scale {
                    animation: fade-in-scale 0.6s ease-out;
                }

                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
