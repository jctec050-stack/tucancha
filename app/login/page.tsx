'use client';

import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
    const { login, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            const role = user.role;
            if (role === 'ADMIN') router.push('/admin/dashboard');
            else if (role === 'OWNER') router.push('/dashboard');
            else router.push('/search');
        }
    }, [user, router]);

    // Simple return without blocking UI logic to ensure hydration doesn't mismatch
    // Let the useEffect handle the push.
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            {!user && (
                <LoginForm
                    onLogin={login}
                    onSwitchToRegister={() => router.push('/register')}
                />
            )}
        </div>
    );
}
