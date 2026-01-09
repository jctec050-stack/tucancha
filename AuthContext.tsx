
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthUser, UserRole } from './types';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'padelpro_users';
const SESSION_KEY = 'padelpro_session';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load session on mount
    useEffect(() => {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (sessionData) {
            try {
                const userData = JSON.parse(sessionData);
                setUser(userData);
            } catch (e) {
                console.error('Error loading session:', e);
            }
        }
        setIsLoading(false);
    }, []);

    // Get all registered users from localStorage
    const getUsers = (): AuthUser[] => {
        const usersData = localStorage.getItem(STORAGE_KEY);
        if (!usersData) return [];
        try {
            return JSON.parse(usersData);
        } catch (e) {
            console.error('Error parsing users:', e);
            return [];
        }
    };

    // Save users to localStorage
    const saveUsers = (users: AuthUser[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const users = getUsers();
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!foundUser) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        if (foundUser.password !== password) {
            return { success: false, error: 'Contraseña incorrecta' };
        }

        // Create user session (without password)
        const userSession: User = {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role
        };

        setUser(userSession);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
        return { success: true };
    };

    const register = async (name: string, email: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
        const users = getUsers();

        // Check if email already exists
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, error: 'Este email ya está registrado' };
        }

        // Create new user
        const newUser: AuthUser = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            email,
            password, // In production, this should be hashed
            role
        };

        users.push(newUser);
        saveUsers(users);

        // Auto-login after registration
        const userSession: User = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role
        };

        setUser(userSession);
        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
        return { success: true };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
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
