const nodemailer = require('nodemailer');

function sanitize(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

function getField(payload, key) {
  return sanitize(payload[key]);
}

function buildHtml(data) {
  const rows = Object.entries(data)
    .map(([key, value]) => `<tr><td style="padding:8px;border:1px solid #ddd;"><b>${key}</b></td><td style="padding:8px;border:1px solid #ddd;">${value || '-'}</td></tr>`)
    .join('');
  return `<table style="border-collapse:collapse;border:1px solid #ddd;">${rows}</table>`;
}

module.exports = async function handler(req, res) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ ok: false, message: 'Method not allowed', requestId });
  }

  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.titan.email';
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
    const smtpUser = process.env.SMTP_USER || 'info@ascenttaxacademy.com';
    const smtpPass = process.env.SMTP_PASS;
    const toEmail = process.env.FORM_TO_EMAIL || 'info@ascenttaxacademy.com';
    const fromEmail = process.env.FORM_FROM_EMAIL || `Ascent Tax Academy <${smtpUser}>`;

    console.log(`[${requestId}] submit:start`, {
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      fromEmail,
      toEmail,
      hasSmtpPass: Boolean(smtpPass)
    });

    if (!smtpPass) {
      console.error(`[${requestId}] submit:config_error SMTP_PASS missing`);
      return res.status(500).json({ ok: false, message: 'Server email config missing: SMTP_PASS', requestId });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const formType = getField(payload, 'formType');
    const name = getField(payload, 'name');
    const email = getField(payload, 'email');
    const phone = getField(payload, 'phone');
    const preferredProgram = getField(payload, 'preferredProgram');
    const message = getField(payload, 'message');
    const sourcePage = getField(payload, 'sourcePage');
    const honey = getField(payload, 'honey');

    if (honey) {
      console.warn(`[${requestId}] submit:honeypot_triggered`);
      return res.status(200).json({ ok: true, requestId });
    }

    if (!name || !email) {
      console.error(`[${requestId}] submit:validation_error name/email missing`);
      return res.status(400).json({ ok: false, message: 'Name and email are required.', requestId });
    }

    const isEnrollment = formType === 'enrollment';
    const isContact = formType === 'contact';

    if (!isEnrollment && !isContact) {
      console.error(`[${requestId}] submit:validation_error invalid formType`, { formType });
      return res.status(400).json({ ok: false, message: 'Invalid form type.', requestId });
    }

    if (isEnrollment && (!phone || !preferredProgram)) {
      console.error(`[${requestId}] submit:validation_error enrollment fields missing`);
      return res.status(400).json({ ok: false, message: 'Phone and preferred program are required.', requestId });
    }

    if (isContact && !message) {
      console.error(`[${requestId}] submit:validation_error contact message missing`);
      return res.status(400).json({ ok: false, message: 'Message is required.', requestId });
    }

    const subject = isEnrollment
      ? 'New Enrollment Request - Ascent Tax Academy'
      : 'New Contact Message - Ascent Tax Academy';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const html = buildHtml({
      Form: isEnrollment ? 'Enrollment' : 'Contact',
      Name: name,
      Email: email,
      Phone: phone,
      'Preferred Program': preferredProgram,
      Message: message,
      'Source Page': sourcePage,
      'Received At (UTC)': new Date().toISOString()
    });

    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject,
      html
    };

    console.log(`[${requestId}] submit:send_attempt`, { subject, formType });
    const info = await transporter.sendMail(mailOptions);
    console.log(`[${requestId}] submit:send_success`, { messageId: info.messageId || null });
    return res.status(200).json({ ok: true, id: info.messageId || null, requestId });
  } catch (error) {
    console.error(`[${requestId}] submit:send_error`, {
      message: error && error.message ? error.message : null,
      code: error && error.code ? error.code : null,
      command: error && error.command ? error.command : null,
      stack: error && error.stack ? error.stack : null
    });
    return res.status(500).json({
      ok: false,
      message: error && error.message ? error.message : 'Unexpected server error.',
      requestId
    });
  }
};
