'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export const Footer = () => {
    const [version, setVersion] = useState<string>('');
    const [buildTime, setBuildTime] = useState<string>('');

    useEffect(() => {
        fetch('/version.json')
            .then(res => res.json())
            .then(data => {
                setVersion(data.version);
                setBuildTime(new Date(data.buildTime).toLocaleString());
            })
            .catch(err => console.error('Error loading version:', err));
    }, []);

    if (!version) return null;

    return (
        <footer className="hidden md:block w-full py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50 mt-auto">
            <p>
                v{version}
                <span className="hidden sm:inline"> • Actualizado: {buildTime}</span>
            </p>
            <p className="mt-1">
                © {new Date().getFullYear()} TuCancha!. Todos los derechos reservados.
            </p>
            <div className="mt-2 space-x-4">
                <Link href="/terms" className="hover:underline hover:text-gray-600 transition-colors">
                    Términos y Condiciones
                </Link>
                <span>•</span>
                <Link href="/privacy" className="hover:underline hover:text-gray-600 transition-colors">
                    Política de Privacidad
                </Link>
            </div>
        </footer>
    );
};
