/**
 * WhatsApp notification service via CallMeBot free API.
 *
 * Setup (one-time, done by the admin at ADMIN_WHATSAPP_NUMBER):
 *   1. Save +34 644 44 69 48 as a contact named "CallMeBot"
 *   2. Send the message:  I allow callmebot to send me messages
 *      to that WhatsApp number
 *   3. You'll receive your personal apikey in reply — set it as
 *      CALLMEBOT_API_KEY in .env
 *
 * Docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 */

const ADMIN_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER ?? '255718119562';
const API_KEY      = process.env.CALLMEBOT_API_KEY     ?? '';

export async function sendAdminWhatsApp(text: string): Promise<{ ok: boolean; detail?: string }> {
  if (!API_KEY) {
    console.warn('[WhatsApp] CALLMEBOT_API_KEY not set — message not sent. Text was:', text);
    return { ok: false, detail: 'CALLMEBOT_API_KEY not configured' };
  }

  const url = new URL('https://api.callmebot.com/whatsapp.php');
  url.searchParams.set('phone',  ADMIN_NUMBER);
  url.searchParams.set('text',   text);
  url.searchParams.set('apikey', API_KEY);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
    const body = await res.text();
    if (res.ok) {
      console.log('[WhatsApp] Message sent to', ADMIN_NUMBER);
      return { ok: true };
    }
    console.error('[WhatsApp] CallMeBot error', res.status, body);
    return { ok: false, detail: body };
  } catch (err) {
    console.error('[WhatsApp] Network error:', err);
    return { ok: false, detail: String(err) };
  }
}

