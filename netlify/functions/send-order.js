const nodemailer = require('nodemailer');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function mapCurrencyCode(payload) {
  if (payload.currencyCode) {
    return payload.currencyCode;
  }

  const localeCountryCode = payload.order?.localeCountryCode;

  switch (localeCountryCode) {
    case 'GH':
      return 'GHS';
    case 'KE':
      return 'KES';
    case 'NG':
      return 'NGN';
    case 'ZA':
      return 'ZAR';
    case 'US':
      return 'USD';
    default:
      return 'USD';
  }
}

function formatCurrency(amount, currencyCode) {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount)) {
    return escapeHtml(amount || '');
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(parsedAmount);
  } catch {
    return `${parsedAmount.toLocaleString('en-US')} ${escapeHtml(currencyCode)}`.trim();
  }
}

function renderRows(rows) {
  return rows
    .filter(([, value]) => value !== null && typeof value !== 'undefined' && String(value).trim() !== '')
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join('');
}

function buildOrderHtml(payload) {
  const order = payload.order || {};
  const currencyCode = mapCurrencyCode(payload);
  const totalLabel = formatCurrency(payload.total ?? order.finalAmount, currencyCode);

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <h2 style="margin:0 0 16px;">New Order Details</h2>
      <p><strong>Customer:</strong> ${escapeHtml(payload.name || order.customerName || '')}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email || order.customerEmail || 'Not provided')}</p>
      <p><strong>Items:</strong> ${escapeHtml(payload.items || order.packageTitle || order.productName || '')}</p>
      <p><strong>Total:</strong> ${totalLabel}</p>
      <table style="border-collapse:collapse;width:100%;margin-top:20px;">
        ${renderRows([
          ['Order ID', payload.orderId || ''],
          ['Created At', order.createdAt || ''],
          ['Country', order.localeCountryCode || ''],
          ['Product', order.productName || ''],
          ['Product Slug', order.productSlug || ''],
          ['Package', order.packageTitle || ''],
          ['Package Label', order.packageLabel || ''],
          ['Package Description', order.packageDescription || ''],
          ['Sets Included', order.setsIncluded || ''],
          ['Quantity', order.quantity || ''],
          ['Phone', order.customerPhone || ''],
          ['Address', order.customerAddress || ''],
          ['City / Region', order.city || ''],
          ['Delivery Note', order.shortDeliveryMessage || ''],
          ['Customer Token', order.customerToken || ''],
          ['Base Amount', formatCurrency(order.baseAmount, currencyCode)],
          ['Discount Percentage', order.discountPercentage ? `${order.discountPercentage}%` : '0%'],
          ['Discount Amount', formatCurrency(order.discountAmount, currencyCode)],
          ['Final Amount', formatCurrency(order.finalAmount, currencyCode)],
        ])}
      </table>
    </div>
  `;
}

function buildSubscriptionHtml(payload) {
  const subscription = payload.subscription || {};

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <h2 style="margin:0 0 16px;">New Subscription Details</h2>
      <p><strong>Customer:</strong> ${escapeHtml(payload.name || subscription.fullName || '')}</p>
      <p><strong>Email:</strong> ${escapeHtml(payload.email || subscription.email || '')}</p>
      <table style="border-collapse:collapse;width:100%;margin-top:20px;">
        ${renderRows([
          ['Full Name', subscription.fullName || ''],
          ['Email', subscription.email || ''],
          ['Gender', subscription.gender || ''],
          ['Location', subscription.location || ''],
          ['Token', subscription.token || ''],
          ['Source Product', subscription.sourceProductName || ''],
          ['Source Slug', subscription.sourceProductSlug || ''],
          ['Source Page', subscription.sourcePageUrl || ''],
        ])}
      </table>
    </div>
  `;
}

function buildContactHtml(payload) {
  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;">
      <h2 style="margin:0 0 16px;">New Contact Message</h2>
      <table style="border-collapse:collapse;width:100%;margin-top:20px;">
        ${renderRows([
          ['Name', payload.name || ''],
          ['Email', payload.email || ''],
          ['Subject', payload.subject || ''],
          ['Message', payload.message || ''],
        ])}
      </table>
    </div>
  `;
}

function buildMailOptions(payload) {
  const submissionType =
    payload.type === 'subscription'
      ? 'subscription'
      : payload.type === 'contact'
        ? 'contact'
        : 'order';
  const subject =
    submissionType === 'subscription'
      ? `New Subscription Received: ${payload.email || payload.name || 'Subscriber'}`
      : submissionType === 'contact'
        ? `New Contact Message: ${payload.subject || payload.name || 'General Inquiry'}`
        : `New Order Received: ${payload.orderId || 'General Inquiry'}`;

  const html =
    submissionType === 'subscription'
      ? buildSubscriptionHtml(payload)
      : submissionType === 'contact'
        ? buildContactHtml(payload)
        : buildOrderHtml(payload);

  return {
    from: `CloudMarket Orders <${process.env.GMAIL_USER}>`,
    to: process.env.GMAIL_USER,
    replyTo: payload.email || undefined,
    subject,
    html,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Gmail SMTP credentials.' }),
    };
  }

  let data;

  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload.' }),
    };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail(buildMailOptions(data));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email Sent Successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unable to send email.' }),
    };
  }
};
