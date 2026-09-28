import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { partidos } = await request.json();
    console.log("RESEND KEY LENGHT:", process.env.RESEND_API_KEY?.length);

    if (!partidos || partidos.length === 0) {
      return NextResponse.json({ message: 'No hay partidos para notificar' }, { status: 400 });
    }

    // Organizar los partidos por correo electrónico de los clubes
    const notificacionesPorClub: Record<string, { nombreClub: string, partidos: any[] }> = {};

    partidos.forEach((partido: any) => {
      const local = partido.equipo_local;
      const visitante = partido.equipo_visitante;

      // Si el equipo local tiene correo
      if (local && local.correo_electronico) {
        if (!notificacionesPorClub[local.correo_electronico]) {
          notificacionesPorClub[local.correo_electronico] = { nombreClub: local.nombre, partidos: [] };
        }
        notificacionesPorClub[local.correo_electronico].partidos.push(partido);
      }

      // Si el equipo visitante tiene correo
      if (visitante && visitante.correo_electronico) {
        if (!notificacionesPorClub[visitante.correo_electronico]) {
          notificacionesPorClub[visitante.correo_electronico] = { nombreClub: visitante.nombre, partidos: [] };
        }
        // Evitar duplicados si por error juegan contra sí mismos (improbable pero seguro)
        if (!notificacionesPorClub[visitante.correo_electronico].partidos.find(p => p.id === partido.id)) {
          notificacionesPorClub[visitante.correo_electronico].partidos.push(partido);
        }
      }
    });

    const correosAEnviar = Object.keys(notificacionesPorClub);

    if (correosAEnviar.length === 0) {
      return NextResponse.json({ message: 'No hay correos registrados para enviar notificaciones' }, { status: 200 });
    }

    // Preparar las promesas de envío de Resend
    const promesasEnvio = correosAEnviar.map(async (correo) => {
      const datosClub = notificacionesPorClub[correo];
      
      const partidosHTML = datosClub.partidos.map(p => {
        const logoLocal = p.equipo_local?.logo_url 
          ? `<img src="${p.equipo_local.logo_url}" width="22" height="22" style="vertical-align: middle; margin-right: 6px; object-fit: contain;" />` 
          : '';
        const logoVisitante = p.equipo_visitante?.logo_url 
          ? `<img src="${p.equipo_visitante.logo_url}" width="22" height="22" style="vertical-align: middle; margin-left: 6px; object-fit: contain;" />` 
          : '';

        return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px 8px; font-weight: bold; color: #333;">
            <div style="margin-bottom: 4px;">
              ${logoLocal}<span style="vertical-align: middle;">${p.equipo_local.nombre}</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-left: 12px; margin-bottom: 4px;">VS</div>
            <div>
              ${logoVisitante}<span style="vertical-align: middle;">${p.equipo_visitante.nombre}</span>
            </div>
          </td>
          <td style="padding: 12px 8px; color: #555; vertical-align: middle;">${p.categoria}</td>
          <td style="padding: 12px 8px; color: #555; white-space: nowrap; vertical-align: middle;">📅 ${p.fecha}</td>
          <td style="padding: 12px 8px; color: #555; white-space: nowrap; vertical-align: middle;">⏱️ ${p.hora}</td>
          <td style="padding: 12px 8px; color: #555; vertical-align: middle;">📍 ${p.lugar}</td>
        </tr>
      `}).join('');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">¡Nuevos Partidos Programados! 🏀</h1>
          </div>
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Hola <strong>${datosClub.nombreClub}</strong>,</p>
            <p style="font-size: 16px; color: #555; line-height: 1.5;">La liga acaba de hacer oficial el nuevo calendario y tu club tiene compromisos programados. Aquí están los detalles de tus próximos juegos:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px; font-size: 14px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
                  <th style="padding: 12px 8px; color: #475569;">Encuentro</th>
                  <th style="padding: 12px 8px; color: #475569;">Categoría</th>
                  <th style="padding: 12px 8px; color: #475569;">Fecha</th>
                  <th style="padding: 12px 8px; color: #475569;">Hora</th>
                  <th style="padding: 12px 8px; color: #475569;">Sede</th>
                </tr>
              </thead>
              <tbody>
                ${partidosHTML}
              </tbody>
            </table>
            
            <p style="font-size: 14px; color: #64748b; font-style: italic;">Por favor, preséntense 30 minutos antes del salto entre dos.</p>
          </div>
          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #eaeaea;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Plataforma Oficial de la Liga &copy; ${new Date().getFullYear()}</p>
          </div>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: 'Liga de Baloncesto <notificaciones@29oncemedios.com>',
        to: correo,
        subject: `📅 Calendario Oficial: Nuevos partidos para ${datosClub.nombreClub}`,
        html: htmlContent,
      });
      
      if (error) {
        console.error('Error de Resend para', correo, ':', error);
        return { success: false, error };
      }
      return { success: true, data };
    });

    const resultados = await Promise.all(promesasEnvio);
    const fallos = resultados.filter(r => !r.success);

    if (fallos.length > 0) {
      return NextResponse.json({ error: 'Resend rechazó el envío', detalles: fallos.map(f => f.error) }, { status: 500 });
    }

    return NextResponse.json({ message: 'Notificaciones enviadas exitosamente' }, { status: 200 });

  } catch (error) {
    console.error('Error enviando correos:', error);
    return NextResponse.json({ error: 'Fallo al procesar el envío de correos' }, { status: 500 });
  }
}
