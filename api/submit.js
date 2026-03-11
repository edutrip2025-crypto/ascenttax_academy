const nodemailer = require('nodemailer');

function sanitize(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

function getField(payload, key) {
  return sanitize(payload[key]);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseRequestBody(req) {
  const body = req.body;
  if (!body) return {};

  if (typeof body === 'object') {
    return body;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      const params = new URLSearchParams(body);
      const parsed = {};
      for (const [key, value] of params.entries()) parsed[key] = value;
      return parsed;
    }
  }

  return {};
}

function buildRows(data) {
  const rows = Object.entries(data)
    .map(([key, value]) => `<tr><td style="padding:10px;border:1px solid #e6e9ef;background:#f8fafc;"><b>${escapeHtml(key)}</b></td><td style="padding:10px;border:1px solid #e6e9ef;">${escapeHtml(value || '-')}</td></tr>`)
    .join('');
  return `<table style="border-collapse:collapse;border:1px solid #e6e9ef;width:100%;">${rows}</table>`;
}

function wrapMail({ title, subtitle, bodyHtml, logoUrl }) {
  return `
  <div style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,sans-serif;color:#10233b;">
    <div style="max-width:680px;margin:20px auto;background:#ffffff;border:1px solid #dbe3ee;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 20px;background:linear-gradient(90deg,#0f3560,#1f5d97);color:#ffffff;">
        <img src="${escapeHtml(logoUrl)}" alt="Ascent Tax Academy" style="height:48px;width:auto;display:block;margin-bottom:10px;">
        <h2 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h2>
        <p style="margin:8px 0 0;opacity:.95;font-size:14px;">${escapeHtml(subtitle)}</p>
      </div>
      <div style="padding:18px 20px;font-size:15px;line-height:1.7;">
        ${bodyHtml}
      </div>
    </div>
  </div>`;
}

function buildAdminHtml({ isEnrollment, name, email, phone, preferredProgram, message, sourcePage, requestId, logoUrl }) {
  const rows = buildRows({
    Form: isEnrollment ? 'Enrollment' : 'Contact',
    Name: name,
    Email: email,
    Phone: phone,
    'Preferred Program': preferredProgram,
    Message: message,
    'Source Page': sourcePage,
    'Received At (UTC)': new Date().toISOString(),
    'Request Reference': requestId
  });

  return wrapMail({
    title: isEnrollment ? 'New Enrollment Request' : 'New Contact Message',
    subtitle: 'Website form submission received',
    logoUrl,
    bodyHtml: `
      <p style="margin-top:0;">A new form submission was received on the website.</p>
      ${rows}
      <p style="margin:14px 0 0;">Please follow up promptly with the learner.</p>
    `
  });
}

function buildAckHtml({ isEnrollment, name, preferredProgram, logoUrl }) {
  const trackLine = isEnrollment
    ? `Preferred Program: <b>${escapeHtml(preferredProgram || 'Not specified')}</b>`
    : 'Your message has been received by our counseling team.';

  const nextSteps = isEnrollment
    ? `
      <li>Profile and goal review</li>
      <li>Recommended learning path</li>
      <li>Batch and schedule discussion</li>
    `
    : `
      <li>Review your query</li>
      <li>Share relevant course details</li>
      <li>Call or WhatsApp follow-up if needed</li>
    `;

  return wrapMail({
    title: 'Thank You for Contacting Ascent Tax Academy',
    subtitle: 'Acknowledgement of your form submission',
    logoUrl,
    bodyHtml: `
      <p style="margin-top:0;">Hi <b>${escapeHtml(name)}</b>,</p>
      <p>Thank you for reaching out to Ascent Tax Academy. ${trackLine}</p>
      <p style="margin-bottom:8px;"><b>What happens next:</b></p>
      <ul style="margin-top:0;padding-left:18px;">
        ${nextSteps}
      </ul>
      <p>For urgent support, call or WhatsApp us at <b>+91 70957 25073</b> / <b>+91 70923 08797</b>.</p>
      <p style="margin-bottom:0;">Regards,<br><b>Ascent Tax Academy Team</b></p>
    `
  });
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
    const logoUrl = process.env.FORM_LOGO_URL || 'https://www.ascenttaxacademy.com/assets/ascent_logo.png';

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

    const payload = parseRequestBody(req);
    const formType = getField(payload, 'formType') || 'contact';
    const name = getField(payload, 'name');
    const email = getField(payload, 'email');
    const phone = getField(payload, 'phone');
    const preferredProgram = getField(payload, 'preferredProgram') || getField(payload, 'preferred_program');
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

    const buildTransporter = (secureFlag) =>
      nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: secureFlag,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

    const adminHtml = buildAdminHtml({
      isEnrollment,
      name,
      email,
      phone,
      preferredProgram,
      message,
      sourcePage,
      requestId,
      logoUrl
    });
    const ackHtml = buildAckHtml({
      isEnrollment,
      name,
      preferredProgram,
      logoUrl
    });

    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject,
      html: adminHtml
    };

    const ackMailOptions = {
      from: fromEmail,
      to: email,
      subject: isEnrollment
        ? 'Enrollment Request Received - Ascent Tax Academy'
        : 'Message Received - Ascent Tax Academy',
      html: ackHtml
    };

    console.log(`[${requestId}] submit:send_attempt`, { subject, formType, smtpSecure });
    let info;
    try {
      info = await buildTransporter(smtpSecure).sendMail(mailOptions);
      await buildTransporter(smtpSecure).sendMail(ackMailOptions);
    } catch (error) {
      const errMessage = error && error.message ? error.message : '';
      const shouldRetryInsecure = smtpSecure && /wrong version number/i.test(errMessage);
      if (!shouldRetryInsecure) throw error;

      console.warn(`[${requestId}] submit:retry_insecure_tls`, {
        reason: 'wrong version number',
        retrySecure: false
      });
      info = await buildTransporter(false).sendMail(mailOptions);
      await buildTransporter(false).sendMail(ackMailOptions);
    }
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
