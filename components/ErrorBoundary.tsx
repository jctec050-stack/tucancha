'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar errores de React y prevenir pantallas blancas
 * Uso: Envolver componentes con <ErrorBoundary>...</ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        // Actualizar estado para renderizar fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log del error para debugging
        console.error('❌ Error capturado por ErrorBoundary:', error);
        console.error('ℹ️ Component Stack:', errorInfo.componentStack);

        // Guardar información del error en el estado
        this.setState({
            error,
            errorInfo,
        });

        // TODO: Cuando Sentry esté configurado, enviar error allí
        // Sentry.captureException(error, { contexts: { react: errorInfo } });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            // Si se proporcionó un fallback custom, usarlo
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Usar fallback por defecto
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                        {/* Icon */}
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-red-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                        </div>

                        {/* Mensaje */}
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Algo salió mal
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Lo sentimos, ha ocurrido un error inesperado. Puedes intentar recargar la página o volver al inicio.
                        </p>

                        {/* Error details (solo en desarrollo) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-6 text-left bg-gray-50 rounded-lg p-4 max-h-40 overflow-auto">
                                <p className="text-xs font-mono text-red-600 break-all">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-sm"
                            >
                                🔄 Recargar Página
                            </button>
                            <button
                                onClick={() => (window.location.href = '/')}
                                className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition"
                            >
                                🏠 Ir al Inicio
                            </button>
                        </div>

                        {/* Soporte */}
                        <p className="text-xs text-gray-500 mt-6">
                            Si el problema persiste, contacta a soporte técnico
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
