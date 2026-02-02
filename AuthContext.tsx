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

    // Cache to prevent unnecessary refetches if ID doesn't change
    const profileCache = useRef<Map<string, User>>(new Map());
    // Promise deduplication to prevent race conditions
    const ongoingFetch = useRef<Promise<User | null> | null>(null);

    /**
     * Robustly retrieves the user profile.
     * Implements Request Deduplication and In-Memory Caching.
     */
    const fetchProfile = async (userId: string, email: string): Promise<User | null> => {
        // 1. Check Memory Cache first
        if (profileCache.current.has(userId)) {
            const cachedUser = profileCache.current.get(userId)!;
            // Auto-update email in cache if it differs
            if (cachedUser.email !== email) {
                cachedUser.email = email;
            }
            return cachedUser;
        }

        // 2. Request Deduplication
        if (ongoingFetch.current) {
            return ongoingFetch.current;
        }

        const fetchPromise = (async () => {
            try {
                // Fetch with a reasonable timeout (20s) to prevent infinite hangs
                const timeoutPromise = new Promise((_, reject) => 
                     setTimeout(() => reject(new Error('Profile fetch timed out')), 20000)
                );

                const dbPromise = supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any;

                if (error) throw error;

                if (data) {
                    const userProfile: User = {
                        id: userId,
                        email: email,
                        name: data.full_name,
                        role: data.role as UserRole,
                        phone: data.phone
                    };
                    
                    // Update Cache
                    profileCache.current.set(userId, userProfile);
                    return userProfile;
                }
                
                // Handle case: User in Auth but missing Profile (Data inconsistency)
                console.warn('⚠️ Profile missing for user, attempting auto-fix...');
                
                // Sub-optimal but functional: Create a default profile to unblock the user
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: email,
                        full_name: email.split('@')[0],
                        role: 'PLAYER' // Default safety role
                    });

                if (insertError) {
                    console.error('❌ Failed to auto-fix profile:', insertError);
                    return null;
                }
                
                // Return provisional user immediately
                const provisionalUser: User = {
                     id: userId,
                     email: email,
                     name: email.split('@')[0],
                     role: 'PLAYER',
                     phone: undefined
                };
                profileCache.current.set(userId, provisionalUser);
                return provisionalUser;

            } catch (error) {
                console.error('❌ Error fetching profile:', error);
                return null;
            } finally {
                ongoingFetch.current = null;
            }
        })();

        ongoingFetch.current = fetchPromise;
        return fetchPromise;
    };

    const initializeAuth = async () => {
        try {
            // Get initial session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.warn('Session check failed:', error.message);
                setUser(null);
                return;
            }

            if (session?.user?.email) {
                const userProfile = await fetchProfile(session.user.id, session.user.email);
                if (userProfile) {
                    setUser(userProfile);
                }
            }
        } catch (error) {
            console.error('❌ Critical Auth Initialization Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            // console.log(`🔐 Auth Event: ${event}`);

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session?.user?.email) {
                    // Update user state smoothly
                    const userProfile = await fetchProfile(session.user.id, session.user.email);
                    if (userProfile) {
                        setUser(prev => {
                            // Only update state if JSON differs to avoid re-renders
                            if (JSON.stringify(prev) !== JSON.stringify(userProfile)) {
                                return userProfile;
                            }
                            return prev;
                        });
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                profileCache.current.clear();
            }
            
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                return { 
                    success: false, 
                    error: error.message.includes('Invalid login') 
                        ? 'Usuario o contraseña incorrectos.' 
                        : 'Error al iniciar sesión.'
                };
            }

            if (data.user?.email) {
                // Force fresh fetch on login
                profileCache.current.delete(data.user.id);
                const profile = await fetchProfile(data.user.id, data.user.email);
                if (profile) setUser(profile);
            }

            return { success: true };
        } catch (e) {
            return { success: false, error: 'Error inesperado de red.' };
        }
    };

    const register = async (name: string, email: string, phone: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
        try {
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

            if (error) {
                if (error.message.includes('already registered')) return { success: false, error: 'Este correo ya está registrado.' };
                return { success: false, error: error.message };
            }
            
            if (data.user) return { success: true };
            return { success: false, error: 'Error desconocido al registrar.' };

        } catch (e) {
             return { success: false, error: 'Error inesperado.' };
        }
    };

    const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/reset-password`,
            });
            if (error) throw error;
            return { success: true };
        } catch (e) {
            return { success: false, error: 'Error al enviar email de recuperación.' };
        }
    };

    const logout = async () => {
        setUser(null);
        profileCache.current.clear();
        try {
            await supabase.auth.signOut();
        } catch (e) {
            // Ignore errors on logout
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
