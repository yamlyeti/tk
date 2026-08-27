import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from 'https://deno.land/x/denomailer@1.3.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserDigest {
  email: string;
  fullName: string | null;
  totalSeconds: number;
  entryCount: number;
  daysTracked: number;
  topProject: string | null;
  topTag: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');
    const gmailFrom = Deno.env.get('GMAIL_FROM') || gmailUser;
    const appUrl = Deno.env.get('APP_URL') || 'https://tk.bergman.rocks';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!gmailUser || !gmailAppPassword) {
      return new Response(
        JSON.stringify({ error: 'Email credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('is_active', true)
      .eq('approval_status', 'approved');

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active users.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: projects } = await supabase.from('projects').select('id, name');
    const projectNameById = new Map((projects || []).map((p) => [p.id, p.name]));

    const client = new SmtpClient();
    await client.connectTLS({ hostname: 'smtp.gmail.com', port: 465, username: gmailUser, password: gmailAppPassword });

    const results: { email: string; sent: boolean; error?: string }[] = [];

    for (const user of users) {
      if (!user.email) continue;

      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('duration, start_time, project_id, tags')
        .eq('user_id', user.id)
        .not('end_time', 'is', null)
        .gte('start_time', weekAgo.toISOString());

      if (entriesError) {
        results.push({ email: user.email, sent: false, error: entriesError.message });
        continue;
      }

      const digest = buildDigest(user.full_name, user.email, entries || [], projectNameById);

      try {
        await client.send({
          from: gmailFrom!,
          to: user.email,
          subject: digest.entryCount > 0
            ? `Your week on tk: ${formatDuration(digest.totalSeconds)} tracked`
            : `tk missed you this week`,
          html: buildDigestHtml(digest, appUrl),
        });
        results.push({ email: user.email, sent: true });
      } catch (err) {
        results.push({ email: user.email, sent: false, error: err instanceof Error ? err.message : String(err) });
      }
    }

    await client.close();

    return new Response(JSON.stringify({ sent: results.filter((r) => r.sent).length, total: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildDigest(
  fullName: string | null,
  email: string,
  entries: { duration: number | null; start_time: string; project_id: string | null; tags: string | null }[],
  projectNameById: Map<string, string>
): UserDigest {
  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const uniqueDays = new Set(entries.map((e) => new Date(e.start_time).toDateString()));

  const projectSeconds = new Map<string, number>();
  const tagSeconds = new Map<string, number>();
  for (const e of entries) {
    const seconds = e.duration || 0;
    if (e.project_id) {
      projectSeconds.set(e.project_id, (projectSeconds.get(e.project_id) || 0) + seconds);
    }
    if (e.tags) {
      for (const tag of e.tags.split(',').map((t) => t.trim()).filter(Boolean)) {
        tagSeconds.set(tag, (tagSeconds.get(tag) || 0) + seconds);
      }
    }
  }

  const topProjectId = [...projectSeconds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTag = [...tagSeconds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    email,
    fullName,
    totalSeconds,
    entryCount: entries.length,
    daysTracked: uniqueDays.size,
    topProject: topProjectId ? projectNameById.get(topProjectId) || null : null,
    topTag: topTag || null,
  };
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function buildDigestHtml(digest: UserDigest, appUrl: string): string {
  const name = digest.fullName || digest.email.split('@')[0];

  if (digest.entryCount === 0) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#D4AF37 0%,#B8860B 100%);padding:36px 40px;color:#1a1000;">
      <h1 style="margin:0;font-size:24px;font-weight:800;">tk</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">Time, tracked.</p>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${name},</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4030;">
        No time logged in tk this past week. If you've been working, it's not tracked — and it's not billed.
        Takes about ten seconds to start a timer.
      </p>
      <a href="${appUrl}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#D4AF37 0%,#C8960A 100%);color:#1a1000;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
        Open tk
      </a>
    </div>
  </div>
</body>
</html>`;
  }

  const statRow = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;color:#6b7280;font-size:14px;">${label}</td>
      <td style="padding:10px 0;text-align:right;font-weight:700;color:#111827;font-size:14px;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#D4AF37 0%,#B8860B 100%);padding:36px 40px;color:#1a1000;">
      <h1 style="margin:0;font-size:24px;font-weight:800;">tk</h1>
      <p style="margin:6px 0 0;opacity:0.85;font-size:14px;">Your week, tracked.</p>
    </div>
    <div style="padding:40px;">
      <p style="margin:0 0 24px;font-size:16px;color:#111827;">Hi ${name}, here's your last 7 days:</p>
      <table style="width:100%;border-collapse:collapse;">
        ${statRow('Time tracked', formatDuration(digest.totalSeconds))}
        ${statRow('Entries logged', String(digest.entryCount))}
        ${statRow('Days active', String(digest.daysTracked))}
        ${digest.topProject ? statRow('Top project', digest.topProject) : ''}
        ${digest.topTag ? statRow('Top tag', digest.topTag) : ''}
      </table>
      <a href="${appUrl}" style="display:inline-block;margin-top:28px;padding:12px 24px;background:linear-gradient(135deg,#D4AF37 0%,#C8960A 100%);color:#1a1000;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">
        Open tk
      </a>
      <p style="margin-top:32px;font-size:12px;color:#9ca3af;">You're getting this because you have an active tk account. Turn this off any time by asking your admin.</p>
    </div>
  </div>
</body>
</html>`;
}
