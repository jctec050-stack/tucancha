import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
        <div className="mb-8">
          <Link href="/register" className="text-indigo-600 font-bold hover:underline flex items-center gap-2 mb-6">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al registro
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Términos y Condiciones</h1>
          <p className="text-gray-500">Última actualización: {new Date().toLocaleDateString('es-PY')}</p>
        </div>

        <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar la plataforma TuCancha, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá utilizar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. Descripción del Servicio</h2>
            <p>
              TuCancha es una plataforma que conecta a jugadores con complejos deportivos para facilitar la reserva de canchas. No somos propietarios ni operamos los complejos deportivos listados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. Registro de Usuario</h2>
            <p>
              Para utilizar el servicio, debe registrarse proporcionando información veraz y completa. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. Reservas y Cancelaciones</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Las reservas están sujetas a la disponibilidad del complejo.</li>
              <li>Las políticas de cancelación son establecidas por cada complejo deportivo.</li>
              <li>El usuario se compromete a respetar los horarios reservados y las normas de cada complejo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. Responsabilidades</h2>
            <p>
              TuCancha no se hace responsable por lesiones, daños o pérdidas ocurridas dentro de los complejos deportivos. La relación contractual por el uso de las instalaciones es directamente entre el usuario y el complejo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">6. Privacidad de Datos</h2>
            <p>
              Sus datos personales serán tratados de acuerdo con nuestra Política de Privacidad. Utilizamos su información para gestionar las reservas y mejorar el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">7. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de su publicación en la plataforma.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center">
          <Link 
            href="/register" 
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            Entendido, volver al registro
          </Link>
        </div>
      </div>
    </div>
  );
}
