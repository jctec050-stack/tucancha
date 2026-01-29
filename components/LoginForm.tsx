
import React, { useState } from 'react';
import { PasswordResetModal } from './PasswordResetModal';
import { useAuth } from '@/AuthContext';

interface LoginFormProps {
    onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister }) => {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        const result = await onLogin(email, password);
        setLoading(false);

        if (!result.success) {
            setError(result.error || 'Error al iniciar sesión');
        }
    };

    const handlePasswordReset = async (email: string) => {
        const result = await resetPassword(email);
        if (!result.success) {
            setError(result.error || 'Error al enviar email de recuperación');
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl">
                <div className="mb-6 text-center">
                    <div className="inline-block mb-4">
                        <img src="/logo.png" alt="TuCancha" className="w-56 h-56 object-contain" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Bienvenido</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-base"
                            placeholder="tu@email.com"
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-base"
                            placeholder="Tu contraseña"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 md:py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>

                    {/* Forgot Password Link */}
                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        ¿No tienes cuenta?{' '}
                        <button
                            onClick={onSwitchToRegister}
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Regístrate
                        </button>
                    </p>
                </div>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && (
                <PasswordResetModal
                    onClose={() => setShowResetModal(false)}
                    onSubmit={handlePasswordReset}
                />
            )}
        </div>
    );
};
