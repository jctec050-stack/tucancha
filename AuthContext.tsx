'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, UserRole } from './types';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, phone: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchingProfileRef = useRef<string | null>(null);

    const fetchProfile = async (userId: string, email: string, retryCount = 0) => {
        // Prevent concurrent fetches for the same user (only for initial attempt)
        if (retryCount === 0 && fetchingProfileRef.current === userId) {
            console.log('🔄 Profile fetch already in progress for', userId);
            return;
        }

        if (retryCount === 0) {
            fetchingProfileRef.current = userId;
        }

        try {
            console.log(`👤 Fetching profile for user: ${userId} (Attempt ${retryCount + 1})`);
            
            // Add timeout to prevent hanging indefinitely
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile fetch timed out')), 8000)
            );

            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            // Cast to any because Promise.race type inference can be tricky with different return types
            const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const { data, error } = result;

            if (error) {
                console.error('❌ Error fetching profile:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                return;
            }

            if (data) {
                console.log('✅ Profile loaded:', data.full_name);
                setUser({
                    id: userId,
                    email: email,
                    name: data.full_name,
                    role: data.role as UserRole,
                    phone: data.phone
                });
            } else {
                // Profile doesn't exist (likely an old user from before DB reset)
                console.log('⚠️ Profile not found for user:', userId, '- Attempting to create one...');

                if (retryCount >= 2) {
                    console.error('🛑 Max retries reached. Could not create/fetch profile.');
                    return;
                }

                // Try to insert a default profile
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: email,
                        full_name: email.split('@')[0], // Fallback name
                        role: 'OWNER' // Default to OWNER for now to be safe, or 'PLAYER'
                    });

                if (insertError) {
                    console.error('❌ Failed to create missing profile:', insertError);
                } else {
                    console.log('✅ Missing profile created successfully. Retrying fetch...');
                    // Retry fetch with incremented counter
                    await fetchProfile(userId, email, retryCount + 1);
                }
            }
        } catch (e: any) {
            // Ignore AbortError (common when switching tabs or rapid navigation)
            if (e.name === 'AbortError' || e.message?.includes('AbortError')) {
                console.log('ℹ️ Fetch profile aborted');
                return;
            }
            console.error('❌ Exception fetching profile:', e);
        } finally {
            // Clear the lock only if this is the root call
            if (retryCount === 0) {
                fetchingProfileRef.current = null;
            }
        }
    };

    useEffect(() => {
        // Check active session
        const initSession = async () => {
            try {
                console.log('🔐 Initializing session...');
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('❌ Session error:', error);
                    // Handle invalid refresh token by clearing session
                    if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
                        console.log('⚠️ Token inválido/expirado detectado. Limpiando sesión...');
                        await supabase.auth.signOut();
                        setUser(null);
                    }
                    setIsLoading(false);
                    return;
                }

                if (session?.user?.email) {
                    console.log('✅ Session found, fetching profile...');
                    await fetchProfile(session.user.id, session.user.email);
                } else {
                    console.log('ℹ️ No active session');
                }
            } catch (error) {
                console.error('❌ Exception during session init:', error);
            } finally {
                // Always set loading to false, even if there's an error
                setIsLoading(false);
                console.log('✅ Session initialization complete');
            }
        };

        initSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state changed:', event);
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
        const { data, error } = await supabase.auth.signInWithPassword({
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

        if (data.user) {
            // Await profile fetch to ensure user state is ready before resolving
            await fetchProfile(data.user.id, data.user.email!);
        }

        return { success: true };
    };

    const register = async (name: string, email: string, phone: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
        console.log('Attempting to register user:', { name, email, role });

        // Sign up with metadata so the trigger (schema.sql) can populate the profiles table
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                    phone: phone
                },
                emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL || window.location.origin
            }
        });

        console.log('Supabase signUp response:', { data, error });

        if (error) {
            console.error('Registration error:', error);

            // Check for common errors
            if (error.message.includes('already registered') || error.message.includes('User already registered')) {
                return { success: false, error: 'Este correo ya está registrado. Intenta iniciar sesión.' };
            }

            if (error.message.includes('Invalid email')) {
                return { success: false, error: 'El formato del email no es válido.' };
            }

            if (error.message.includes('Password')) {
                return { success: false, error: 'La contraseña no cumple con los requisitos mínimos.' };
            }

            // Generic database error
            if (error.message.includes('Database') || error.message.includes('database')) {
                return { success: false, error: 'Error al guardar en la base de datos. Por favor intenta nuevamente.' };
            }

            return { success: false, error: error.message };
        }

        // Check if user was created successfully
        if (!data.user) {
            console.error('No user data returned after signup');
            return { success: false, error: 'Error al crear la cuenta. Por favor intenta nuevamente.' };
        }

        console.log('Registration successful, user created:', data.user.id);
        return { success: true };
    };

    const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/reset-password`,
        });

        if (error) {
            console.error('Password reset error:', error);
            return { success: false, error: 'Error al enviar el email. Verifica que el correo sea correcto.' };
        }

        return { success: true };
    };

    const logout = async () => {
        // Optimistic logout: clear state immediately for instant UI response
        console.log('🚪 Logging out...');
        setUser(null);

        // Sign out in background
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                // Ignore session missing error as we are logging out anyway
                if (error.message?.includes('session missing') || error.status === 403) {
                    console.log('ℹ️ Session already expired or missing during logout.');
                } else {
                    console.warn('⚠️ Logout warning:', error.message);
                }
            } else {
                console.log('✅ Logout successful');
            }
        } catch (error) {
            console.warn('⚠️ Exception during logout (background):', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, resetPassword, logout, isLoading }}>
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
