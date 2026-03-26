const crypto = require('crypto');

const DEFAULT_GRAPH_VERSION = process.env.META_CONVERSIONS_API_GRAPH_VERSION || 'v24.0';

function json(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeEmail(value) {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizePhone(value) {
  return normalizeWhitespace(value).replace(/\D+/g, '');
}

function normalizeNamePart(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function splitFullName(fullName) {
  const parts = normalizeWhitespace(fullName)
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function hashNormalizedValue(value) {
  if (!value) {
    return '';
  }

  if (isSha256(value)) {
    return value.toLowerCase();
  }

  return crypto.createHash('sha256').update(value).digest('hex');
}

function sanitizeNumber(value) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function sanitizeString(value) {
  return String(value ?? '').trim();
}

function sanitizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => sanitizeString(item)).filter(Boolean);
}

function sanitizeContents(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      return {
        id: sanitizeString(item.id),
        quantity: Math.max(1, Math.floor(sanitizeNumber(item.quantity))),
        item_price: sanitizeNumber(item.item_price),
      };
    })
    .filter((item) => item && item.id);
}

function readClientIp(event) {
  const forwardedFor = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'];

  if (forwardedFor) {
    return String(forwardedFor).split(',')[0].trim();
  }

  return (
    event.headers['client-ip'] ||
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-real-ip'] ||
    ''
  );
}

function readUserAgent(event, payload) {
  return (
    sanitizeString(payload.userData?.clientUserAgent) ||
    event.headers['user-agent'] ||
    event.headers['User-Agent'] ||
    ''
  );
}

function buildUserData(event, payload) {
  const email = normalizeEmail(payload.userData?.email);
  const phone = normalizePhone(payload.userData?.phone);
  const fullName = normalizeWhitespace(payload.userData?.customerName);
  const { firstName, lastName } = splitFullName(fullName);
  const clientIp = readClientIp(event);
  const clientUserAgent = readUserAgent(event, payload);
  const fbp = sanitizeString(payload.userData?.fbp);
  const fbc = sanitizeString(payload.userData?.fbc);
  const userData = {};

  if (email) {
    userData.em = [hashNormalizedValue(email)];
  }

  if (phone) {
    userData.ph = [hashNormalizedValue(phone)];
  }

  if (firstName) {
    userData.fn = [hashNormalizedValue(normalizeNamePart(firstName))];
  }

  if (lastName) {
    userData.ln = [hashNormalizedValue(normalizeNamePart(lastName))];
  }

  if (fbp) {
    userData.fbp = fbp;
  }

  if (fbc) {
    userData.fbc = fbc;
  }

  if (clientIp) {
    userData.client_ip_address = clientIp;
  }

  if (clientUserAgent) {
    userData.client_user_agent = clientUserAgent;
  }

  return userData;
}

function buildCustomData(payload) {
  return {
    currency: sanitizeString(payload.customData?.currency || 'USD'),
    value: sanitizeNumber(payload.customData?.value),
    order_id: sanitizeString(payload.customData?.orderId || payload.eventId),
    content_ids: sanitizeStringArray(payload.customData?.contentIds),
    content_name: sanitizeString(payload.customData?.contentName),
    content_type: sanitizeString(payload.customData?.contentType || 'product'),
    contents: sanitizeContents(payload.customData?.contents),
    num_items: Math.max(1, Math.floor(sanitizeNumber(payload.customData?.numItems || 1))),
  };
}

function buildEventPayload(event, payload) {
  const eventTime = Math.floor(sanitizeNumber(payload.eventTime || Date.now() / 1000));

  return {
    event_name: sanitizeString(payload.eventName || 'Purchase'),
    event_time: eventTime,
    event_id: sanitizeString(payload.eventId),
    action_source: 'website',
    event_source_url:
      sanitizeString(payload.eventSourceUrl) ||
      event.headers.referer ||
      event.headers.Referrer ||
      '',
    user_data: buildUserData(event, payload),
    custom_data: buildCustomData(payload),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  if (!process.env.META_CONVERSIONS_API_ACCESS_TOKEN) {
    return json(500, { error: 'Missing Meta Conversions API access token.' });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const pixelId = sanitizeString(payload.pixelId);
  const eventId = sanitizeString(payload.eventId);

  if (!pixelId) {
    return json(400, { error: 'Missing Meta Pixel ID.' });
  }

  if (!eventId) {
    return json(400, { error: 'Missing event ID.' });
  }

  const requestBody = {
    data: [buildEventPayload(event, payload)],
  };

  if (process.env.META_CONVERSIONS_API_TEST_EVENT_CODE) {
    requestBody.test_event_code = process.env.META_CONVERSIONS_API_TEST_EVENT_CODE;
  }

  const endpoint = `https://graph.facebook.com/${DEFAULT_GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(process.env.META_CONVERSIONS_API_ACCESS_TOKEN)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json().catch(() => null);

    if (!response.ok) {
      return json(response.status, {
        error: 'Meta Conversions API request failed.',
        details: result,
      });
    }

    return json(200, {
      message: 'Meta conversion sent successfully.',
      eventsReceived: result?.events_received ?? null,
      fbtraceId: result?.fbtrace_id ?? null,
    });
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : 'Unable to send Meta conversion.',
    });
  }
};
