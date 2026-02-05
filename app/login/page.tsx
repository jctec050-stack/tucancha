'use client';

import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <LoginForm
                onLogin={login}
                onSwitchToRegister={() => router.push('/register')}
            />
        </div>
    );
}
