import React, { useState, useEffect } from 'react';

interface TermsModalProps {
    isOpen: boolean;
    onAccept: () => void;
    onReject: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onAccept, onReject }) => {
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                                    Bienvenido a TuCancha - Tu Socio de Negocios
                                </h3>
                                <div className="mt-4">
                                    <p className="text-sm text-gray-500 mb-4">
                                        Gracias por unirte a la red de canchas más grande del país. Para comenzar, por favor acepta nuestros términos de servicio diseñados para impulsar tu crecimiento.
                                    </p>
                                    
                                    <div className="bg-indigo-50 rounded-xl p-4 mb-4 border border-indigo-100">
                                        <h4 className="font-bold text-indigo-900 text-sm mb-2">🎁 Prueba Gratuita</h4>
                                        <p className="text-sm text-indigo-700">
                                            Disfruta de los primeros <strong>30 días totalmente gratis</strong>. Sin comisiones, sin ataduras. Prueba todas las funciones premium.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="font-bold text-gray-900 text-sm">Modelo de Negocio (Post-Prueba):</h4>
                                        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                                            <li>
                                                <strong>Comisión Justa:</strong> Solo cobramos <strong>5.000 Gs</strong> por cada hora reservada exitosamente a través de la app.
                                            </li>
                                            <li>
                                                <strong>Pago a Fin de Mes:</strong> El corte se realiza mensualmente. Solo pagas por lo que vendes.
                                            </li>
                                            <li>
                                                <strong>Sin Riesgos:</strong> Si no recibes reservas por la app, no pagas absolutamente nada.
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
                            onClick={onAccept}
                        >
                            Acepto las condiciones y comienzo mi prueba gratis
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-xl border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onReject}
                        >
                            No acepto (Cancelar Registro)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};