
import React, { useState } from 'react';
import { PasswordResetModal } from './PasswordResetModal';
import { useAuth } from '@/AuthContext';

interface LoginFormProps {
    onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToRegister }) => {
    const { resetPassword, loginWithGoogle } = useAuth();
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

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500 font-medium italic">O continuar con</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={async () => {
                        setError('');
                        setLoading(true);
                        const result = await loginWithGoogle();
                        if (!result.success) {
                            setError(result.error || 'Error al conectar con Google');
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="w-full py-4 border border-gray-200 bg-white text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 touch-manipulation"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Google
                </button>

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
