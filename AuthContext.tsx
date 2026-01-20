'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (userId: string, email: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return;
            }

            if (data) {
                setUser({
                    id: userId,
                    email: email,
                    name: data.full_name,
                    role: data.role as UserRole
                });
            } else {
                // Profile doesn't exist yet (might be waiting for trigger)
                console.log('Profile not found yet for user:', userId);
            }
        } catch (e) {
            console.error('Exception fetching profile:', e);
        }
    };

    useEffect(() => {
        // Check active session
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                await fetchProfile(session.user.id, session.user.email);
            }
            setIsLoading(false);
        };

        initSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user?.email) {
                await fetchProfile(session.user.id, session.user.email);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            // Check if it's an invalid credentials error (user doesn't exist or wrong password)
            if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
                return { success: false, error: 'Usuario no registrado o contraseña incorrecta' };
            }
            return { success: false, error: error.message };
        }

        return { success: true };
    };

    const register = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
        console.log('Attempting to register user:', { name, email, role });

        // Sign up with metadata so the trigger (schema.sql) can populate the profiles table
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role
                },
                emailRedirectTo: window.location.origin
            }
        });

        console.log('Supabase signUp response:', { data, error });

        if (error) {
            console.error('Registration error:', error);

            // Check for common errors
            if (error.message.includes('already registered')) {
                return { success: false, error: 'Este correo ya está registrado. Intenta iniciar sesión.' };
            }

            return { success: false, error: error.message };
        }

        console.log('Registration successful');
        return { success: true };
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
