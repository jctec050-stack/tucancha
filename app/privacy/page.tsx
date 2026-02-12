import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
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
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">POLÍTICA DE PRIVACIDAD</h1>
          <p className="text-gray-500">Última actualización: {new Date().toLocaleDateString('es-PY')}</p>
        </div>

        <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
          <section>
            <p>
              En TuCancha, valoramos la confianza que depositas en nosotros al compartir tus datos. Esta Política explica qué información recopilamos, cómo la protegemos y para qué la utilizamos. Al utilizar nuestra plataforma, aceptas las prácticas descritas aquí.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">1. INFORMACIÓN QUE RECOPILAMOS</h2>
            <p>Para que la experiencia de juego sea fluida, recolectamos los siguientes datos:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="font-semibold text-gray-900">Datos de registro:</span> Nombre, apellido y correo electrónico para crear tu perfil.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Datos de contacto:</span> Número de teléfono (necesario para que los Clubes confirmen tus reservas).
              </li>
              <li>
                <span className="font-semibold text-gray-900">Ubicación:</span> Accedemos a tu geolocalización (si lo permites) para mostrarte las canchas más cercanas a tu posición actual.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Información del dispositivo:</span> Marca, modelo y sistema operativo para asegurar que la app funcione correctamente en tu celular.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Fotos de perfil:</span> Puedes elegir subir una foto. Si vinculas tu cuenta con Google o Facebook, utilizaremos la imagen de perfil de dicha red social.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">2. USO DE LA INFORMACIÓN</h2>
            <p>Utilizamos tus datos para:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="font-semibold text-gray-900">Gestionar reservas:</span> Enviar tus datos básicos al Club donde reservaste para que sepan quién llega a la cancha.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Seguridad y Prevención:</span> Detectar posibles fraudes o usos indebidos de la plataforma.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Comunicación:</span> Enviarte confirmaciones de reserva, actualizaciones del servicio y, si lo autorizas, promociones exclusivas.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Soporte Técnico:</span> Ayudarte en caso de problemas con tu cuenta o una transacción.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">3. INTERCAMBIO DE DATOS CON TERCEROS</h2>
            <p>TuCancha NO vende ni alquila tus datos personales. Solo compartimos información cuando es estrictamente necesario:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="font-semibold text-gray-900">Con los Clubes:</span> Compartimos tu nombre y teléfono para concretar la reserva deportiva.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Proveedores de pago:</span> Si realizas pagos en línea, tus datos financieros son procesados por plataformas de pago seguras bajo estándares de cifrado (SSL/TLS).
              </li>
              <li>
                <span className="font-semibold text-gray-900">Requerimientos legales:</span> Solo entregaremos información si existe una orden judicial o para proteger la integridad de nuestros usuarios.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">4. ALMACENAMIENTO Y SEGURIDAD</h2>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="font-semibold text-gray-900">Servidores:</span> Tus datos se almacenan en servidores seguros en la nube (Cloud) con altos estándares de protección física y digital.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Cifrado:</span> Toda la comunicación entre tu dispositivo y nuestros servidores viaja cifrada para evitar intercepciones.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Responsabilidad del usuario:</span> Te recomendamos proteger tu cuenta con una contraseña segura y no compartir tus credenciales de acceso.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">5. MENORES DE EDAD</h2>
            <p>
              TuCancha está diseñado para mayores de 18 años. No recopilamos conscientemente datos de menores. Si detectamos que un menor de edad ha creado una cuenta sin autorización de sus tutores, procederemos a eliminar la información de inmediato.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">6. TUS DERECHOS (ARCO)</h2>
            <p>En cualquier momento puedes ejercer tus derechos de:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <span className="font-semibold text-gray-900">Acceso:</span> Saber qué datos tenemos de ti.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Rectificación:</span> Corregir información desactualizada o errónea.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Cancelación:</span> Solicitar la eliminación de tu cuenta y datos personales.
              </li>
              <li>
                <span className="font-semibold text-gray-900">Oposición:</span> Pedir que no usemos tus datos para fines de marketing.
              </li>
            </ul>
            <p className="mt-4">
              Para cualquiera de estas solicitudes, puedes escribirnos a: <a href="mailto:jctec050@gmail.com" className="text-indigo-600 hover:underline">jctec050@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-2">7. CAMBIOS EN ESTA POLÍTICA</h2>
            <p>
              Nos reservamos el derecho de actualizar esta política para adaptarla a nuevas leyes o funciones de la app. Te notificaremos cualquier cambio importante a través de un mensaje en la aplicación o por correo electrónico.
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
