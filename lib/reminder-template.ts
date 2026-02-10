/**
 * Función helper para templates de recordatorio
 */

export interface BookingReminderData {
    playerName: string;
    playerEmail: string;
    courtName: string;
    venueName: string;
    venueAddress: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    price: number;
}

export function generateBookingReminderEmail(data: BookingReminderData) {
    const { playerName, courtName, venueName, venueAddress, bookingDate, startTime, endTime, price } = data;
    const [year, month, day] = bookingDate.split('-');
    const dateFormatted = `${day}/${month}/${year}`;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #4F46E5; margin: 10px 0 0 0; font-size: 28px; }
    .emoji { font-size: 48px; }
    .info-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-item { margin: 12px 0; font-size: 16px; }
    .location-box { background-color: #F3F4F6; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .price { background-color: #10B981; color: white; padding: 10px 15px; border-radius: 6px; display: inline-block; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; color: #6B7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="emoji">⚽🎾🏆</div>
      <h1>¡Recordatorio de Reserva!</h1>
    </div>
    <p>¡Hola <strong>${playerName}</strong>! 👋</p>
    <p>Te recordamos que tu reserva es <strong>hoy</strong>. ¡Ya falta poco para que juegues!</p>
    <div class="info-box">
      <h3 style="margin: 0 0 15px 0;">📋 Detalles de tu Reserva</h3>
      <div class="info-item">🎾 <strong>Cancha:</strong> ${courtName}</div>
      <div class="info-item">🏢 <strong>Complejo:</strong> ${venueName}</div>
      <div class="info-item">📅 <strong>Fecha:</strong> ${dateFormatted}</div>
      <div class="info-item">🕐 <strong>Horario:</strong> ${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}</div>
    </div>
    <div class="location-box">
      <p><strong>📍 Ubicación:</strong></p>
      <p>${venueAddress}</p>
    </div>
    <div class="price">💰 Precio: Gs. ${price.toLocaleString('es-PY')}</div>
    <p style="margin-top: 30px;"><strong>¡Nos vemos pronto! 🏆</strong></p>
    <p style="color: #6B7280; font-size: 14px;">Te recomendamos llegar 10 minutos antes.</p>
    <div class="footer">
      <p><strong>TuCancha</strong></p>
      <p style="font-size: 12px; color: #9CA3AF;">Este es un mensaje automático.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
