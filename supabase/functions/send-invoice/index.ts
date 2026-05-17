import { SmtpClient } from 'https://deno.land/x/denomailer@1.3.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LineItem {
  id: string;
  description: string;
  amount: number;
}

interface UserSummary {
  fullName: string | null;
  email: string;
  totalHours: number;
  averageRate: number;
  totalAmount: number;
  currency: string;
}

interface InvoicePayload {
  recipientEmail: string;
  recipientName?: string;
  startDate: string;
  endDate: string;
  projectName?: string;
  orgName?: string;
  userSummaries: UserSummary[];
  lineItems: LineItem[];
  subtotal: number;
  lineItemsTotal: number;
  invoiceTotal: number;
  note?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: InvoicePayload = await req.json();

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailAppPassword) {
      return new Response(
        JSON.stringify({ error: 'Email credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = buildInvoiceHtml(payload, gmailUser);

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port: 465,
      username: gmailUser,
      password: gmailAppPassword,
    });

    await client.send({
      from: gmailUser,
      to: payload.recipientEmail,
      subject: `Invoice – ${payload.startDate} to ${payload.endDate}${payload.projectName ? ` – ${payload.projectName}` : ''}`,
      html,
    });

    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildInvoiceHtml(p: InvoicePayload, fromEmail: string): string {
  const invoiceDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const userRows = p.userSummaries.map(u => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">
        <strong>${u.fullName || 'Team Member'}</strong>
        <div style="font-size:12px;color:#6b7280;">${u.email}</div>
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${u.totalHours.toFixed(2)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">${u.averageRate > 0 ? `${u.currency} ${u.averageRate.toFixed(2)}/hr` : '—'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${u.currency} ${u.totalAmount.toFixed(2)}</td>
    </tr>`).join('');

  const lineItemRows = p.lineItems.map(item => `
    <tr>
      <td colspan="3" style="padding:10px 8px;border-bottom:1px solid #e5e7eb;color:${item.amount < 0 ? '#ef4444' : '#111827'};">
        ${item.description}
      </td>
      <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:${item.amount < 0 ? '#ef4444' : '#111827'};">
        ${item.amount < 0 ? '-' : ''}$${Math.abs(item.amount).toFixed(2)}
      </td>
    </tr>`).join('');

  const subtotalRow = p.lineItems.length > 0 ? `
    <tr>
      <td colspan="3" style="padding:10px 8px;text-align:right;color:#6b7280;font-size:14px;">Subtotal:</td>
      <td style="padding:10px 8px;text-align:right;color:#6b7280;">$${p.subtotal.toFixed(2)}</td>
    </tr>` : '';

  const noteHtml = p.note ? `
    <div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;border-left:4px solid #10b981;">
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Note:</strong> ${p.note}</p>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#14b8a6 100%);padding:40px;color:white;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0;font-size:36px;font-weight:800;letter-spacing:-1px;">INVOICE</h1>
          <p style="margin:8px 0 0;opacity:0.85;font-size:14px;">Date: ${invoiceDate}</p>
          <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">Period: ${p.startDate} – ${p.endDate}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:14px;opacity:0.85;">Amount Due</p>
          <p style="margin:4px 0 0;font-size:40px;font-weight:800;">$${p.invoiceTotal.toFixed(2)}</p>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">

      <!-- Bill To -->
      <div style="margin-bottom:32px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Bill To</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#111827;">${p.recipientName || p.recipientEmail}</p>
        <p style="margin:4px 0 0;color:#6b7280;">${p.recipientEmail}</p>
        ${p.projectName ? `<p style="margin:4px 0 0;color:#6b7280;">${p.projectName}${p.orgName ? ` · ${p.orgName}` : ''}</p>` : ''}
      </div>

      <!-- From -->
      <div style="margin-bottom:32px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">From</p>
        <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${fromEmail}</p>
      </div>

      <!-- Line items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 8px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Description</th>
            <th style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Hours</th>
            <th style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Rate</th>
            <th style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${userRows}
          ${lineItemRows}
        </tbody>
        <tfoot>
          ${subtotalRow}
          <tr style="background:#f0fdf4;">
            <td colspan="3" style="padding:16px 8px;text-align:right;font-size:18px;font-weight:700;color:#111827;border-top:2px solid #10b981;">Total Due:</td>
            <td style="padding:16px 8px;text-align:right;font-size:22px;font-weight:800;color:#10b981;border-top:2px solid #10b981;">$${p.invoiceTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      ${noteHtml}

      <!-- Footer -->
      <div style="margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Thank you for your business.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
