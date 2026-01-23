
import { GoogleGenAI } from "@google/genai";
import { Booking } from "../types";

export const getPerformanceSummary = async (bookings: Booking[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });

  const statsSummary = bookings.reduce((acc, b) => {
    if (b.status === 'ACTIVE') {
      acc.totalRevenue += b.price;
      acc.totalBookings += 1;
      const sport = (b.court_name || '').includes('Beach') ? 'Beach Tennis' : 'Padel';
      acc.bySport[sport] = (acc.bySport[sport] || 0) + 1;
    } else {
      acc.cancelledCount += 1;
    }
    return acc;
  }, { totalRevenue: 0, totalBookings: 0, cancelledCount: 0, bySport: {} as any });

  const prompt = `
    Analiza estos datos de reservas para un complejo deportivo:
    - Ingresos Totales: Gs. ${statsSummary.totalRevenue.toLocaleString('es-PY')}
    - Reservas Activas: ${statsSummary.totalBookings}
    - Reservas Canceladas: ${statsSummary.cancelledCount}
    - Desglose por deporte: ${JSON.stringify(statsSummary.bySport)}

    Por favor, proporciona un breve resumen ejecutivo (máximo 150 palabras) sobre el rendimiento del negocio y una sugerencia para mejorar la ocupación. Responde en Español.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Error al generar el resumen ejecutivo.";
  }
};
