# Guía de Despliegue en Vercel - TuCancha

## 🚀 Requisitos Previos

1.  **Cuenta en Vercel:** Si no tienes una, crea una en [vercel.com](https://vercel.com).
2.  **Proyecto en GitHub:** Asegúrate de que tu código esté subido a un repositorio de GitHub.
    - Si aún no lo has subido, haz commit y push de todos los cambios recientes.

## 📦 Pasos para Desplegar

### Opción 1: Desde el Dashboard de Vercel (Recomendado)

1.  Ve a tu **Dashboard de Vercel** -> **New Project**.
2.  Importa tu repositorio de Git ("tucancha" o como lo hayas llamado).
3.  En la configuración del proyecto (**Configure Project**):
    *   **Framework Preset:** Next.js (se detectará automáticamente).
    *   **Root Directory:** `./` (déjalo vacío o por defecto).
    *   **Environment Variables:** Despliega esta sección. Necesitas agregar las siguientes variables desde tu archivo `.env.local`:

| Variable Nombre | Valor (Ejemplo/Instrucciones) |
| :--- | :--- |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `AIzaSy...` (Copia de tu .env.local) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aynoabizwaj...` (Copia de tu .env.local) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJMC...` (Copia de tu .env.local) |
| `NEXT_PUBLIC_APP_URL` | `https://tucancha-tuusuario.vercel.app` (La URL que te dará Vercel) |

    > **Nota:** Para `NEXT_PUBLIC_APP_URL`, puedes poner temporalmente `http://localhost:3000` si no sabes tu dominio de Vercel aún, pero recuerda actualizarla después del despliegue en *Settings -> Environment Variables*.

4.  Haz clic en **Deploy**.

### Opción 2: Usando Vercel CLI

Si tienes instalado Vercel CLI (`npm i -g vercel`), puedes ejecutar desde la terminal:

```bash
vercel
```

Sigue las instrucciones en pantalla:
- Set up and deploy? **Yes**
- Scope? **(Tu usuario)**
- Link to existing project? **No**
- Project Name? **tucancha**
- Directory? **./**
- Want to modify settings? **No**

Después del despliegue, recuerda configurar las variables de entorno con:
```bash
vercel env add
```
O ve al dashboard para configurarlas.

## ✅ Verificación Post-Despliegue

1.  Abre la URL de tu aplicación desplegada.
2.  Intenta **iniciar sesión** con tu usuario existente.
3.  Verifica que las imágenes carguen correctamente (Supabase Storage).
4.  Prueba crear una reserva simple.

## ⚠️ Solución de Problemas Comunes

-   **Error 500 en Auth:** Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `ANON_KEY` estén correctas en Vercel.
-   **Imágenes no cargan:** Asegúrate de que los buckets `venue-images` y `court-images` sean públicos en Supabase.
-   **Build fallido por TypeScript:** Vercel es estricto con los tipos. Si falla, revisa los logs de Vercel. Puedes desactivar temporalmente el chequeo de tipos en build modificando `next.config.js` (no recomendado, pero útil para emergencias):

    ```javascript
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    ```
