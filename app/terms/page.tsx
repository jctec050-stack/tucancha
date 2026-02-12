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
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. RELACIÓN CONTRACTUAL</h2>
            <p>
              Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma TuCancha (en adelante, la "Plataforma"), que comprende el sitio web y sus aplicaciones móviles. Al utilizar la Plataforma, usted acepta vincularse legalmente a estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. NATURALEZA DE LA PLATAFORMA</h2>
            <p>TuCancha funciona exclusivamente como un mercado en línea y punto de encuentro.</p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Intermediación:</span> La Plataforma facilita que propietarios de establecimientos deportivos ("Clubes") publiquen sus espacios y que los usuarios ("Jugadores") realicen reservas.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Exclusión de Responsabilidad:</span> TuCancha no es dueño, ni gestiona, ni controla los locales deportivos. El contrato de alquiler de la cancha o servicio deportivo es una transacción directa entre el Club y el Jugador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. REGISTRO Y CUENTA</h2>
            <p>
              Para realizar reservas o publicar anuncios, el usuario debe crear una cuenta con datos exactos y veraces.
            </p>
            <p className="mt-2">
              Usted es responsable de la seguridad de su contraseña y de cualquier actividad realizada bajo su cuenta.
            </p>
            <p className="mt-2">
              El acceso a la plataforma es personal e intransferible.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. OBLIGACIONES DE LOS CLUBES (ANFITRIONES)</h2>
            <p>
              <span className="font-semibold text-gray-900">Legalidad:</span> El Club garantiza que cumple con todas las licencias, permisos y normativas municipales para operar.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Exactitud:</span> El anuncio debe reflejar fielmente el estado, precio y disponibilidad de la cancha.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Seguridad:</span> El Club es el único responsable de la seguridad física de los Jugadores dentro de sus instalaciones.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. OBLIGACIONES DE LOS JUGADORES</h2>
            <p>
              <span className="font-semibold text-gray-900">Uso del Espacio:</span> El Jugador se compromete a utilizar las instalaciones de forma adecuada y a respetar el reglamento interno de cada Club.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Responsabilidad:</span> El Jugador responde por cualquier daño causado a la propiedad del Club por negligencia o mal uso, tanto de su parte como de sus invitados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">6. TARIFAS Y PAGOS</h2>
            <p>
              <span className="font-semibold text-gray-900">Costos de Servicio:</span> TuCancha podrá cobrar una comisión por cada reserva realizada a través de la plataforma, la cual será comunicada antes de confirmar la transacción.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Pagos fuera de plataforma:</span> Se prohíbe explícitamente acordar pagos por fuera de la Plataforma con el fin de eludir las comisiones de TuCancha. El incumplimiento de esta regla podrá causar la baja definitiva de la cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">7. CANCELACIONES Y REEMBOLSOS</h2>
            <p>
              Cada Club establece su propia política de cancelación (ej. tiempo mínimo de aviso).
            </p>
            <p className="mt-2">
              En caso de mal clima (para canchas abiertas) o fuerza mayor, el Club podrá cancelar la reserva sin penalización, debiendo coordinar la reprogramación o devolución según lo estipulado en la política de cancelación vigente en el anuncio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">8. CONDUCTA Y EVALUACIONES</h2>
            <p>
              <span className="font-semibold text-gray-900">Respeto:</span> No se tolerará la discriminación, el lenguaje ofensivo o la violencia de cualquier tipo.
            </p>
            <p className="mt-2">
              <span className="font-semibold text-gray-900">Reseñas:</span> Los usuarios podrán calificarse mutuamente. Estas evaluaciones deben ser honestas y no manipuladas. TuCancha se reserva el derecho de eliminar comentarios difamatorios o falsos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">9. LIMITACIÓN DE RESPONSABILIDAD</h2>
            <p>TuCancha no será responsable por:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Lesiones físicas, accidentes o incidentes de salud ocurridos durante el uso de las canchas.</li>
              <li>Robos o pérdidas de pertenencias personales en los predios deportivos.</li>
              <li>Fallos técnicos en la Plataforma que impidan temporalmente realizar una reserva.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">10. JURISDICCIÓN Y LEY APLICABLE</h2>
            <p>
              Para cualquier controversia derivada del uso de la Plataforma, las partes acuerdan someterse a las leyes vigentes en la jurisdicción donde se presta el servicio y a los tribunales competentes de dicha zona.
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
