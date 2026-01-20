# TuCancha! 🎾

Sistema de gestión y reserva de canchas de padel y beach tennis.

## Características

- 🏢 **Panel de Dueños**: Gestiona tus canchas, horarios y reservas
- 👤 **Portal de Jugadores**: Busca y reserva canchas fácilmente
- 📅 **Reservas en Tiempo Real**: Sistema de reservas instantáneo
- 🔔 **Notificaciones**: Mantente informado sobre tus reservas
- 📊 **Dashboard Analítico**: Visualiza estadísticas de tu complejo

## Ejecutar Localmente

**Prerequisitos:** Node.js

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_key
   GEMINI_API_KEY=tu_gemini_api_key
   ```

3. Ejecutar la aplicación:
   ```bash
   npm run dev
   ```

4. Abrir [http://localhost:3000](http://localhost:3000) en tu navegador

## Tecnologías

- **Framework**: Next.js 15
- **Base de Datos**: Supabase
- **Estilos**: Tailwind CSS
- **IA**: Google Gemini
- **Lenguaje**: TypeScript

## Licencia

© 2026 TuCancha! - Todos los derechos reservados
