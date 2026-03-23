export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const {
    email, name, company, industry,
    score, grade, gradeLabel,
    q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12,
    gaps, pdfBase64, listId
  } = req.body;

  const KEY           = process.env.BREVO_API_KEY;
  const SHEETS_URL    = process.env.SHEETS_URL;
  const BEEHIIV_KEY   = process.env.BEEHIIV_API_KEY;
  const BEEHIIV_PUB   = 'pub_fe54e665-425b-4265-94d1-aeb601eb9257';

  if (!KEY) return res.status(500).json({ error: 'Server configuration error' });

  const headers = {
    'accept':       'application/json',
    'api-key':      KEY,
    'content-type': 'application/json'
  };

  const firstName = name.split(' ')[0];
  const lastName  = name.split(' ').slice(1).join(' ');

  // ── 1. Google Sheets logging ─────────────────────────────────
  if (SHEETS_URL) {
    try {
      await fetch(SHEETS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, company, industry,
          score, grade, gradeLabel,
          q1: q1||'', q2: q2||'', q3: q3||'', q4: q4||'',
          q5: q5||[], q6: q6||'', q7: q7||'',
          q8: q8||[], q9: q9||'', q10: q10||'',
          q11: q11||'', q12: q12||'',
          gaps: gaps||[]
        })
      });
    } catch (err) {
      console.error('Sheets logging error:', err.message);
    }
  }

  // ── 2. beehiiv — subscribe to newsletter ───────────────────
  if (BEEHIIV_KEY) {
    try {
      await fetch(`https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BEEHIIV_KEY}`
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email:  true,
          utm_source:          'hr-foundations-audit',
          utm_medium:          'scorecard',
          custom_fields: [
            { name: 'first_name',  value: firstName       },
            { name: 'last_name',   value: lastName        },
            { name: 'company',     value: company  || ''  },
            { name: 'hr_score',    value: String(score)   },
            { name: 'hr_grade',    value: grade    || ''  },
          ]
        })
      });
    } catch (err) {
      console.error('beehiiv error:', err.message);
    }
  }

  // ── 3. Brevo — add/update contact ───────────────────────────
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        listIds: [parseInt(listId)],
        updateEnabled: true,
        attributes: {
          FIRSTNAME:      firstName,
          LASTNAME:       lastName,
          COMPANY:        company,
          INDUSTRY:       industry    || '',
          HR_SCORE:       score,
          HR_GRADE:       grade,
          HR_GRADE_LABEL: gradeLabel,
          HR_DESIRED:     q4          || '',
          HR_BUDGET:      q11         || '',
          HR_PAST_TRIES:  (q5  || []).join(', '),
          HR_POLICIES:    (q8  || []).join(', '),
          HR_TOP_GAPS:    (gaps || []).join(', ')
        }
      })
    });
  } catch (err) {
    console.error('Brevo contacts error:', err.message);
  }

  // ── 4. Brevo — send email with PDF attachment ────────────────
  const gradeColour = { A:'#2ecc71', B:'#f39c12', C:'#e67e22', D:'#e74c3c', F:'#c0392b' };
  const colour = gradeColour[grade] || '#c08457';
  const gapItems   = (gaps || []).map(g => `<li>${g}</li>`).join('');
  const policyGaps = 10 - (q8 || []).length;
  const policyNote = policyGaps > 0
    ? `<li>You're missing <strong>${policyGaps} of 10</strong> key HR policies</li>`
    : '';

  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:#0e2841;padding:32px 40px 24px;">
  <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#c08457;letter-spacing:0.08em;">FLIGHT<span style="color:#ffffff;">HR</span></p>
  <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.5);">HR Foundations Audit Report</p>
</td></tr>
<tr><td style="background:#c08457;height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:32px 40px 24px;">
  <p style="margin:0 0 6px;font-size:15px;color:#2d3a47;">Hi ${firstName},</p>
  <p style="margin:0 0 24px;font-size:14px;color:#666;line-height:1.7;">Your HR Foundations Audit is complete. Your personalised PDF is attached. Here's your summary:</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0e2841;border-radius:12px;margin-bottom:24px;">
  <tr>
    <td style="padding:24px;text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 4px;font-size:48px;font-weight:700;color:${colour};line-height:1;">${grade}</p>
      <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.1em;">Grade</p>
    </td>
    <td style="padding:24px;text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
      <p style="margin:0 0 4px;font-size:48px;font-weight:700;color:#ffffff;line-height:1;">${score}</p>
      <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.1em;">Out of 100</p>
    </td>
    <td style="padding:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#c08457;line-height:1.3;">${gradeLabel}</p>
      <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:.1em;">Assessment</p>
    </td>
  </tr>
  </table>
  ${gaps && gaps.length > 0 ? `<p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#0e2841;">Your priority areas:</p><ul style="margin:0 0 20px;padding-left:20px;color:#555;font-size:14px;line-height:1.9;">${gapItems}${policyNote}</ul>` : ''}
  <p style="margin:0 0 20px;font-size:13px;color:#666;line-height:1.7;">Your full breakdown and action plan is in the attached PDF.</p>
  <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
    <a href="YOUR_CALENDLY_LINK_HERE" style="display:inline-block;background:#c08457;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:10px;font-size:15px;font-weight:600;">Book Your Free 20-Minute Call →</a>
  </td></tr></table>
</td></tr>
<tr><td style="padding:0 40px 28px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eaf4f4;border-radius:10px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0e2841;text-transform:uppercase;letter-spacing:.08em;">What happens on the call?</p>
    <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">In 20 minutes we'll walk through your gaps, confirm what to fix first, and match you to the right support. No sales pressure.</p>
  </td></tr>
  </table>
</td></tr>
<tr><td style="background:#0e2841;padding:18px 40px;border-top:3px solid #c08457;">
  <p style="margin:0 0 3px;font-size:11px;font-weight:700;color:#c08457;letter-spacing:.08em;">FLIGHTHR</p>
  <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">Fractional HR for UK tech, SaaS & media · flighthr.co.uk</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  try {
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender:      { name: 'FlightHR', email: 'info@flighthr.co.uk' },
        to:          [{ email, name }],
        subject:     `Your HR Foundations Audit — ${gradeLabel} (${score}/100)`,
        htmlContent: htmlBody,
        attachment:  [{ name: 'FlightHR-HR-Foundations-Audit.pdf', content: pdfBase64 }]
      })
    });

    const result = await emailRes.json();
    if (!emailRes.ok) {
      console.error('Brevo email error:', result);
      return res.status(500).json({ error: 'Email send failed', detail: result });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Send error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
