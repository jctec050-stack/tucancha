
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { emailRatelimit, getClientIP } from '@/lib/rate-limit-redis';

export async function POST(request: Request) {
  // ============================================
  // RATE LIMITING: 10 requests por minuto (Upstash Redis)
  // ============================================
  const clientIP = getClientIP(request);
  const { success, limit, remaining, reset } = await emailRatelimit.limit(clientIP);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Has excedido el límite de envío de emails. Por favor intenta nuevamente en unos minutos.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // DIAGNOSTIC LOGS (Safe to expose existence, not values)
    console.log('--- Email Config Diagnosis ---');
    console.log(`SMTP_HOST: ${smtpHost || 'MISSING'}`);
    console.log(`SMTP_PORT: ${smtpPort || 'MISSING'}`);
    console.log(`SMTP_USER: ${smtpUser ? 'PRESENT (Length: ' + smtpUser.length + ')' : 'MISSING'}`);
    console.log(`SMTP_PASS: ${smtpPass ? 'PRESENT (Length: ' + smtpPass.length + ')' : 'MISSING'}`);
    console.log('----------------------------');

    // MOCK MODE if no config
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log('⚠️ Email configuration missing. Mocking email send.');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      return NextResponse.json({ success: true, message: 'Email mocked (config missing)' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: false, // Force false for port 587 (STARTTLS)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        ciphers: 'SSLv3', // Sometimes needed for compatibility
        rejectUnauthorized: true, // Keep true for security unless self-signed
      }
    });

    // Verify connection config
    try {
      await transporter.verify();
      console.log('✅ SMTP Connection verified');
    } catch (verifyError) {
      console.error('❌ SMTP Connection failed:', verifyError);
      return NextResponse.json({ error: 'SMTP Connection failed', details: verifyError }, { status: 500 });
    }

    const info = await transporter.sendMail({
      from: `"TuCancha" <${process.env.EMAIL_FROM || smtpUser}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);

    // Incluir headers de rate limit en respuesta exitosa
    return NextResponse.json(
      { success: true, messageId: info.messageId },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return NextResponse.json({
      error: 'Failed to send email',
      details: error.message || error
    }, { status: 500 });
  }
}
