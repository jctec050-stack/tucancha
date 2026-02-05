import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/30 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                            <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                            <span className="text-indigo-100 text-sm font-medium">La plataforma #1 en gestión deportiva</span>
                        </div>
                        
                        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white mb-8 drop-shadow-lg">
                            Gestioná tu complejo y <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-purple-200">
                                llená tus canchas
                            </span>
                        </h1>
                        
                        <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Olvidate de las planillas de excel y los mensajes de WhatsApp. 
                            Automatizá tus reservas, controlá tus ingresos y brindá la mejor experiencia a tus jugadores.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link 
                                href="/register?role=OWNER" 
                                className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                Registrar mi Complejo
                            </Link>
                            <Link 
                                href="/" 
                                className="w-full sm:w-auto px-8 py-4 bg-indigo-600/50 backdrop-blur-md border border-indigo-400/30 text-white font-bold rounded-xl hover:bg-indigo-600/70 transition flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                Buscar Canchas
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* Wave Separator */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg className="fill-white" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
                    </svg>
                </div>
            </div>

            {/* Value Proposition Section */}
            <div className="py-24 bg-white relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Para Dueños</h2>
                        <p className="mt-2 text-4xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                            Todo lo que necesitas para crecer
                        </p>
                        <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                            Una suite completa de herramientas diseñadas para simplificar la administración de tu complejo deportivo.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Feature 1 */}
                        <div className="relative group p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 hover:shadow-xl transition duration-300">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 rounded-full opacity-50 blur-2xl group-hover:bg-indigo-100 transition"></div>
                            <div className="relative">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Agenda Digital 24/7</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Tus clientes pueden reservar a cualquier hora, sin que tengas que atender el teléfono. Evitá superposiciones y errores humanos.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="relative group p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 hover:shadow-xl transition duration-300">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-50 rounded-full opacity-50 blur-2xl group-hover:bg-purple-100 transition"></div>
                            <div className="relative">
                                <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Reportes y Métricas</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Visualizá tus ingresos, ocupación y horas pico. Tomá decisiones basadas en datos reales y maximizá tu rentabilidad.
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="relative group p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:border-indigo-100 hover:shadow-xl transition duration-300">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-pink-50 rounded-full opacity-50 blur-2xl group-hover:bg-pink-100 transition"></div>
                            <div className="relative">
                                <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-pink-500/30 group-hover:scale-110 transition">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3">Control de Caja</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Registrá pagos, señas y pendientes. Mantené tus finanzas ordenadas y olvidate de los cuadernos perdidos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Player Experience Section */}
            <div className="py-24 bg-gray-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
                        <div className="mb-12 lg:mb-0">
                            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Experiencia del Jugador</h2>
                            <p className="mt-2 text-4xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-6">
                                Reservar nunca fue tan fácil
                            </p>
                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600">
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-xl font-bold text-gray-900">Búsqueda Inteligente</h3>
                                        <p className="mt-2 text-gray-600">Encuentra canchas cercanas con disponibilidad real y filtros por deporte.</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600">
                                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <h3 className="text-xl font-bold text-gray-900">Reserva Instantánea</h3>
                                        <p className="mt-2 text-gray-600">Selecciona el horario, confirma y listo. Sin llamadas ni esperas.</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-10">
                                <Link 
                                    href="/" 
                                    className="text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-2 group"
                                >
                                    Probar la experiencia como jugador
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                </Link>
                            </div>
                        </div>
                        
                        {/* Mockup */}
                        <div className="relative">
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-indigo-200 to-purple-200 rounded-[3rem] transform rotate-3 scale-105 opacity-50 blur-lg"></div>
                            <div className="relative bg-white rounded-[2.5rem] shadow-2xl border-8 border-gray-900 overflow-hidden aspect-[9/16] max-w-sm mx-auto">
                                {/* Status Bar */}
                                <div className="h-8 bg-gray-900 w-full flex items-center justify-between px-6">
                                    <div className="w-12 h-3 bg-black rounded-full"></div>
                                </div>
                                
                                {/* App Content Mockup */}
                                <div className="h-full overflow-y-auto bg-gray-50 pb-20">
                                    {/* App Header */}
                                    <div className="bg-white p-6 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold">Bienvenido,</p>
                                                <p className="text-sm font-bold text-gray-900">Juan Pérez</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* App Hero */}
                                    <div className="p-6">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Busca tu Cancha</h3>
                                        
                                        {/* Venue Card Mockup */}
                                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
                                            <div className="h-32 bg-gray-200 rounded-xl mb-4 relative overflow-hidden">
                                                <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-lg text-[10px] font-bold text-indigo-600">ABIERTO</div>
                                            </div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900">Padel Center Asunción</h4>
                                                <span className="text-indigo-600 font-bold text-sm">4.8 ★</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-4">Av. España 1234</p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-indigo-50 py-2 rounded-lg text-center text-indigo-600 text-xs font-bold">18:00</div>
                                                <div className="flex-1 bg-indigo-50 py-2 rounded-lg text-center text-indigo-600 text-xs font-bold">19:00</div>
                                                <div className="flex-1 bg-gray-100 py-2 rounded-lg text-center text-gray-400 text-xs font-bold line-through">20:00</div>
                                            </div>
                                        </div>
                                        
                                         {/* Venue Card Mockup 2 */}
                                         <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                                            <div className="h-32 bg-gray-200 rounded-xl mb-4"></div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900">World Padel Tour</h4>
                                                <span className="text-indigo-600 font-bold text-sm">5.0 ★</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mb-4">Villa Morra</p>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-center text-xs font-bold shadow-md">Reservar</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Bottom Nav Mockup */}
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around px-6">
                                    <div className="w-6 h-6 bg-indigo-600 rounded-full"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                    <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* CTA Final */}
            <div className="bg-indigo-900 py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl font-extrabold text-white mb-6">¿Listo para modernizar tu complejo?</h2>
                    <p className="text-indigo-200 text-lg mb-8">Unite a la red de canchas más grande y empezá a recibir reservas online hoy mismo.</p>
                    <Link 
                        href="/register?role=OWNER" 
                        className="inline-block px-8 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-lg shadow-green-500/30 transform hover:scale-105"
                    >
                        Comenzar Gratis
                    </Link>
                </div>
            </div>
        </div>
    );
}