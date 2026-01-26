
import React, { useState } from 'react';
import { UserRole } from '../types';
import { SuccessModal } from './SuccessModal';

interface RegisterFormProps {
    onRegister: (name: string, email: string, phone: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegister, onSwitchToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('PLAYER');
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

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

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Tipo de Usuario
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
                                🏢 Dueño
                            </button>
                        </div>
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
                buttonText="Ir al Login"
            />
        </div>
    );
};
