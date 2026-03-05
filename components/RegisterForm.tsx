
import React, { useState } from 'react';
import { UserRole } from '../types';
import { SuccessModal } from './SuccessModal';
import { useAuth } from '@/AuthContext';

interface RegisterFormProps {
    onRegister: (name: string, email: string, phone: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onSwitchToLogin }) => {
    const { loginWithGoogle } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('PLAYER');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!name.trim()) {
            setError('Por favor ingresa tu nombre');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setError('Por favor ingresa un email válido');
            return;
        }

        if (!phone.trim()) {
            setError('Por favor ingresa un número de teléfono');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (!acceptedTerms) {
            setError('Debes aceptar los términos y condiciones para registrarte');
            return;
        }

        setLoading(true);
        const result = await onRegister(name, email, phone, password, role);
        setLoading(false);

        if (!result.success) {
            setError(result.error || 'Error al registrarse');
        } else {
            // Show success modal instead of alert
            setShowSuccessModal(true);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        onSwitchToLogin();
    };

    return (
        <div className="w-full max-w-md">
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl">
                <div className="mb-6 text-center">
                    <div className="inline-block mb-4">
                        <img src="/logo.png" alt="TuCancha" className="w-40 h-40 object-contain" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Crear Cuenta</h2>
                </div>

                {/* Role selector - shared by both registration methods */}
                <div className="mb-5">
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                        ¿Cómo quieres registrarte?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setRole('PLAYER')}
                            className={`py-3.5 md:py-3 px-4 rounded-xl font-bold text-sm transition touch-manipulation ${role === 'PLAYER'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            🎾 Jugador
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('OWNER')}
                            className={`py-3.5 md:py-3 px-4 rounded-xl font-bold text-sm transition touch-manipulation ${role === 'OWNER'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            🏢 Complejo
                        </button>
                    </div>
                </div>

                {/* Terms and conditions - shared by both registration methods */}
                <div className="flex items-start gap-3 py-2 mb-4">
                    <div className="flex items-center h-5">
                        <input
                            id="terms"
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="w-5 h-5 border-gray-300 rounded focus:ring-indigo-500 text-indigo-600 cursor-pointer"
                        />
                    </div>
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none">
                        Acepto los{' '}
                        <a
                            href="/terms"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-indigo-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            términos y condiciones
                        </a>{' '}
                        y la{' '}
                        <a
                            href="/privacy"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-indigo-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            política de privacidad
                        </a>.
                    </label>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                        {error}
                    </div>
                )}

                {/* Google sign-up button - quick registration */}
                <button
                    type="button"
                    onClick={async () => {
                        setError('');
                        if (!acceptedTerms) {
                            setError('Debes aceptar los términos y condiciones para registrarte');
                            return;
                        }
                        setLoading(true);
                        // Save selected role so AuthContext can use it when creating the profile
                        localStorage.setItem('pending_google_role', role);
                        const result = await loginWithGoogle(role);
                        if (!result.success) {
                            setError(result.error || 'Error al conectar con Google');
                            localStorage.removeItem('pending_google_role');
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    className="w-full py-4 border border-gray-200 bg-white text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 touch-manipulation mb-4"
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
                    Registrarse con Google
                </button>

                <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500 font-medium italic">O con email y contraseña</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div>
                        <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                            Nombre Completo
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-base"
                            placeholder="Juan Pérez"
                        />
                    </div>

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
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-2">
                            Teléfono
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-base"
                            placeholder="09xx xxx xxx"
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
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">
                            Confirmar Contraseña
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3.5 md:py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-base"
                            placeholder="Repite tu contraseña"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    >
                        {loading ? 'Registrando...' : 'Crear Cuenta'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-500 text-sm">
                        ¿Ya tienes cuenta?{' '}
                        <button
                            onClick={onSwitchToLogin}
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Inicia Sesión
                        </button>
                    </p>
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                title="¡Cuenta Creada!"
                message="Tu registro ha sido exitoso. Por favor revisa tu email para confirmar tu cuenta y poder iniciar sesión."
                buttonText="Iniciar Sesión"
            />
        </div>
    );
};
