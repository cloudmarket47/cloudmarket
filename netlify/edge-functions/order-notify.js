const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildHtmlEmail(order) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e2e8f0;">
        <p style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#2563eb;font-weight:700;margin:0 0 12px;">New Order Alert</p>
        <h1 style="font-size:28px;line-height:1.1;margin:0 0 12px;">${order.orderNumber}</h1>
        <p style="font-size:16px;line-height:1.7;color:#475569;margin:0 0 24px;">
          ${order.customerName} placed a new order for ${order.productName}.
        </p>

        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:24px;">
          <div style="background:#f8fafc;border-radius:18px;padding:16px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:700;">Customer</p>
            <p style="margin:10px 0 0;font-weight:700;">${order.customerName}</p>
            <p style="margin:6px 0 0;color:#475569;">${order.customerPhone}</p>
          </div>
          <div style="background:#f8fafc;border-radius:18px;padding:16px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;font-weight:700;">Amount</p>
            <p style="margin:10px 0 0;font-weight:700;">${order.finalAmount}</p>
            <p style="margin:6px 0 0;color:#475569;">${order.packageTitle}</p>
          </div>
        </div>

        <div style="background:#0f172a;border-radius:20px;padding:20px;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#94a3b8;font-weight:700;">Delivery</p>
          <p style="margin:0 0 8px;">${order.customerAddress}</p>
          <p style="margin:0;">${order.city} • ${order.localeCountryCode}</p>
        </div>
      </div>
    </div>
  `;
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    const { order } = await request.json();

    if (!order?.orderNumber) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Missing order payload.' }),
        {
          status: 400,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const webhookUrl = Deno.env.get('ORDER_NOTIFICATION_WEBHOOK_URL');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resendFrom = Deno.env.get('ORDER_NOTIFY_FROM') || 'CloudMarket <orders@updates.cloudmarket.store>';
    const resendTo = Deno.env.get('ORDER_NOTIFY_TO');

    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'new_order',
          order,
        }),
      });
    } else if (resendApiKey && resendTo) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [resendTo],
          subject: `New order received: ${order.orderNumber}`,
          html: buildHtmlEmail(order),
        }),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: webhookUrl || (resendApiKey && resendTo)
          ? 'Order notification processed.'
          : 'Order notification skipped because no email provider is configured.',
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: error instanceof Error ? error.message : 'Unable to send order notification.',
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      },
    );
  }
};

export const config = {
  path: '/api/order-notify',
};
