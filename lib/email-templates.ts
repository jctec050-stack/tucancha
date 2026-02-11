
export const generatePlayerBookingEmail = (
  venueName: string,
  venueAddress: string,
  venueMapUrl: string,
  bookings: { date: string; time: string; courtName: string; price: number }[],
  totalPrice: number
) => {
  // Group bookings to merge consecutive slots
  const groupedBookings: typeof bookings = [];
  if (bookings.length > 0) {
    // Sort by date then time
    const sorted = [...bookings].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    let current = { ...sorted[0], endTime: '' };
    // Calculate initial end time (assume 1h if not provided or just next hour)
    const [h, m] = current.time.split(':').map(Number);
    current.endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const nextEndTime = (() => {
        const [nh, nm] = next.time.split(':').map(Number);
        return `${(nh + 1).toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
      })();

      const isSameDate = current.date === next.date;
      const isSameCourt = current.courtName === next.courtName;
      // Check if consecutive: current end time == next start time
      // Note: time format is HH:mm or HH:mm:ss. We use substring(0,5) usually.
      const currentEndSimple = current.endTime.substring(0, 5);
      const nextStartSimple = next.time.substring(0, 5);

      if (isSameDate && isSameCourt && currentEndSimple === nextStartSimple) {
        // Merge
        current.endTime = nextEndTime;
        current.price += next.price;
      } else {
        groupedBookings.push({
          date: current.date,
          time: `${current.time.substring(0, 5)} a ${current.endTime.substring(0, 5)}`,
          courtName: current.courtName,
          price: current.price
        });
        current = { ...next, endTime: nextEndTime };
      }
    }
    groupedBookings.push({
      date: current.date,
      time: `${current.time.substring(0, 5)} a ${current.endTime.substring(0, 5)}`,
      courtName: current.courtName,
      price: current.price
    });
  }

  const bookingRows = groupedBookings
    .map(
      (b) => {
        // Fix Date: Manually parse YYYY-MM-DD to avoid timezone issues
        const [year, month, day] = b.date.split('-');
        const dateFormatted = `${day}/${month}/${year}`;

        return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${dateFormatted}</td>
        <td style="padding: 10px;">${b.time}</td>
        <td style="padding: 10px;">${b.courtName}</td>
        <td style="padding: 10px; text-align: right;">Gs. ${b.price.toLocaleString('es-PY')}</td>
      </tr>
    `
      }
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 20px; }
        .logo { max-width: 150px; }
        .content { margin-bottom: 20px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .footer { font-size: 12px; color: #888; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
        .btn { display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .warning { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 10px; margin-top: 20px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://tucancha.app/logo.png" alt="TuCancha" class="logo" style="max-width: 150px; display: none;"> <!-- Placeholder for logo -->
          <h1 style="color: #4F46E5;">¡Reserva Confirmada!</h1>
          <p>Hola, tu reserva en <strong>${venueName}</strong> ha sido confirmada.</p>
        </div>

        <div class="content">
          <h3>Detalles de la Reserva</h3>
          <table class="table">
            <thead>
              <tr style="background-color: #f8fafc; text-align: left;">
                <th style="padding: 10px;">Fecha</th>
                <th style="padding: 10px;">Horario</th>
                <th style="padding: 10px;">Cancha</th>
                <th style="padding: 10px; text-align: right;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${bookingRows}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; background-color: #f8fafc;">
                <td colspan="3" style="padding: 10px; text-align: right;">Total a Pagar en Complejo:</td>
                <td style="padding: 10px; text-align: right;">Gs. ${totalPrice.toLocaleString('es-PY')}</td>
              </tr>
            </tfoot>
          </table>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${venueMapUrl}" class="btn">📍 Ver Ubicación en Google Maps</a>
            <p style="margin-top: 10px; font-size: 14px;">${venueAddress}</p>
          </div>

          <div class="warning">
            <strong>Política de Cancelación:</strong><br>
            Se puede cancelar la reserva hasta 3hs antes del horario reservado. Posterior a eso, se aplicará una multa en la próxima reserva.
          </div>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} TuCancha. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateOwnerNotificationEmail = (
  venueName: string,
  playerName: string,
  playerPhone: string,
  bookings: { date: string; time: string; courtName: string }[]
) => {
  // Group bookings for owner email too
  const groupedBookings: any[] = [];
  if (bookings.length > 0) {
    const sorted = [...bookings].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    let current = { ...sorted[0], endTime: '' };
    const [h, m] = current.time.split(':').map(Number);
    current.endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const nextEndTime = (() => {
        const [nh, nm] = next.time.split(':').map(Number);
        return `${(nh + 1).toString().padStart(2, '0')}:${nm.toString().padStart(2, '0')}`;
      })();

      const isSameDate = current.date === next.date;
      const isSameCourt = current.courtName === next.courtName;
      const currentEndSimple = current.endTime.substring(0, 5);
      const nextStartSimple = next.time.substring(0, 5);

      if (isSameDate && isSameCourt && currentEndSimple === nextStartSimple) {
        current.endTime = nextEndTime;
      } else {
        groupedBookings.push({
          date: current.date,
          time: `${current.time.substring(0, 5)} a ${current.endTime.substring(0, 5)}`,
          courtName: current.courtName
        });
        current = { ...next, endTime: nextEndTime };
      }
    }
    groupedBookings.push({
      date: current.date,
      time: `${current.time.substring(0, 5)} a ${current.endTime.substring(0, 5)}`,
      courtName: current.courtName
    });
  }

  const bookingRows = groupedBookings
    .map(
      (b) => {
        const [year, month, day] = b.date.split('-');
        const dateFormatted = `${day}/${month}/${year}`;
        return `
      <li>
        <strong>${dateFormatted}</strong> de <strong>${b.time}</strong> en <strong>${b.courtName}</strong>
      </li>
    `
      }
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .content { margin-bottom: 20px; }
        .highlight { background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="color: #166534;">Nueva Reserva Recibida</h2>
          <p>Tienes nuevas reservas en <strong>${venueName}</strong>.</p>
        </div>

        <div class="content">
          <div class="highlight">
            <p><strong>Cliente:</strong> ${playerName}</p>
            <p><strong>Teléfono:</strong> <a href="tel:${playerPhone}" style="color: #166534; font-weight: bold;">${playerPhone}</a></p>
          </div>

          <h3>Detalle de Turnos:</h3>
          <ul>
            ${bookingRows}
          </ul>

          <p>Ingresa a tu panel para ver más detalles.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateCancellationEmail = (
  venueName: string,
  playerName: string,
  bookings: { date: string; time: string; courtName: string }[]
) => {
  const [year, month, day] = bookings[0].date.split('-');
  const dateFormatted = `${day}/${month}/${year}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
        .content { margin-bottom: 20px; }
        .highlight { background-color: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fecaca; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="color: #991b1b;">Reserva Cancelada</h2>
          <p>Una reserva en <strong>${venueName}</strong> ha sido cancelada.</p>
        </div>

        <div class="content">
          <div class="highlight">
            <p><strong>Cliente:</strong> ${playerName}</p>
            <p><strong>Fecha:</strong> ${dateFormatted}</p>
            <p><strong>Horario:</strong> ${bookings[0].time}</p>
            <p><strong>Cancha:</strong> ${bookings[0].courtName}</p>
          </div>

          <p>Ingresa a tu panel para ver más detalles.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
