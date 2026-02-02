
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

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
      from: `"TuCancha" <${smtpUser}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent successfully:', info.messageId);
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error.message || error 
    }, { status: 500 });
  }
}
