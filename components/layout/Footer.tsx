'use client';

import React, { useEffect, useState } from 'react';

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
        <footer className="w-full py-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50 mt-auto">
            <p>
                 v{version}
                <span className="hidden sm:inline"> • Actualizado: {buildTime}</span>
            </p>
            <p className="mt-1">
                © {new Date().getFullYear()} TuCancha!. Todos los derechos reservados.
            </p>
        </footer>
    );
};
