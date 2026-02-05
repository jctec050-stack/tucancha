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
            if (role === 'ADMIN') router.replace('/admin/dashboard');
            else if (role === 'OWNER') router.replace('/dashboard');
            else router.replace('/search');
        }
    }, [user, router]);

    if (user) {
        return (
             <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
             </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
            <LoginForm
                onLogin={login}
                onSwitchToRegister={() => router.push('/register')}
            />
        </div>
    );
}
