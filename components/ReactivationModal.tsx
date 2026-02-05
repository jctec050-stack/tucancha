import React from 'react';

interface ReactivationModalProps {
    isOpen: boolean;
    onReactivate: () => void;
    onLogout: () => void;
}

export const ReactivationModal: React.FC<ReactivationModalProps> = ({ isOpen, onReactivate, onLogout }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                                    ¡Bienvenido de nuevo a TuCancha!
                                </h3>
                                <div className="mt-4">
                                    <p className="text-sm text-gray-500 mb-4">
                                        Notamos que cancelaste tu suscripción anteriormente. Nos alegra tenerte de vuelta.
                                    </p>
                                    
                                    <div className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-100">
                                        <h4 className="font-bold text-yellow-800 text-sm mb-2">⚠️ Reactivación de Cuenta</h4>
                                        <p className="text-sm text-yellow-700">
                                            Al reactivar tu cuenta, aceptas continuar bajo nuestro modelo de negocio estándar. 
                                            <strong> El periodo de prueba gratuito ya ha sido utilizado.</strong>
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-900 text-sm">Condiciones Actuales:</h4>
                                        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                                            <li>
                                                <strong>Comisión:</strong> 5.000 Gs por hora reservada vía app.
                                            </li>
                                            <li>
                                                <strong>Facturación:</strong> Mensual, basada en reservas completadas.
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        <button
                            type="button"
                            className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-3 bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition transform hover:scale-105"
                            onClick={onReactivate}
                        >
                            Acepto y Reactivo mi Cuenta
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onLogout}
                        >
                            Cancelar y Salir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
