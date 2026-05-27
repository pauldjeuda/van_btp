const vlConfig = require('../config/vanLogistique');

const toPlainRequest = (request) => {
  if (!request) return {};
  if (typeof request.get === 'function') return request.get({ plain: true });
  return { ...request };
};

const formatDateOnly = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value.trim().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim().slice(0, 10);
};

const buildPayload = (request) => {
  const plain = toPlainRequest(request);
  const description = String(
    plain.needDescription || plain.equipmentRequested || '',
  ).trim();
  const date = formatDateOnly(plain.desiredDate);

  const payload = {
    description,
    date,
  };

  if (plain.ref) payload.correlationId = String(plain.ref);
  if (plain.id != null) payload.btpRequestId = plain.id;

  return payload;
};

const FETCH_TIMEOUT_MS = Number(process.env.VAN_LOGISTIQUE_TIMEOUT_MS) || 12_000;
const LOG = '[VAN LOGISTIQUE]';

const logConfig = (context) => {
  console.log(`${LOG} [${context}] Configuration:`, {
    enabled: vlConfig.enabled,
    url: vlConfig.url || '(vide)',
    requestPath: vlConfig.requestPath || '(vide)',
    requestUrl: vlConfig.getRequestUrl() || '(non construit)',
    hasApiKey: Boolean(vlConfig.apiKey),
    apiKeyHint: vlConfig.apiKey ? `${String(vlConfig.apiKey).slice(0, 8)}…` : null,
    timeoutMs: FETCH_TIMEOUT_MS,
    outboundEnabled: vlConfig.isOutboundEnabled(),
  });
};

const logFetchError = (err, { url, method, payload }) => {
  console.error(`${LOG} fetch failed — diagnostic:`, {
    context: method,
    url,
    errName: err?.name,
    errMessage: err?.message,
    errCode: err?.cause?.code || err?.code,
    errno: err?.cause?.errno,
    syscall: err?.cause?.syscall,
    address: err?.cause?.address,
    port: err?.cause?.port,
    aborted: err?.name === 'AbortError',
    payload,
    stack: err?.stack,
  });
};

const formatNetworkError = (err, url) => {
  const code = err.cause?.code || err.code || '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }

  const isPrivate = /^(172\.|10\.|192\.168\.|127\.)/.test(host);

  if (code === 'UND_ERR_CONNECT_TIMEOUT' || /timeout/i.test(err.message)) {
    return [
      `Délai dépassé vers ${url}.`,
      'Ce n\'est pas un problème d\'autorisation CORS.',
      isPrivate
        ? 'Vérifiez : serveur logistique démarré, IP/port corrects dans VAN_LOGISTIQUE_URL (backend/.env), PC et logistique sur le même réseau Wi‑Fi.'
        : 'Vérifiez que l\'API logistique est en ligne et joignable depuis le serveur backend.',
    ].join(' ');
  }

  if (code === 'ECONNREFUSED') {
    return [
      `Connexion refusée vers ${url}.`,
      'Aucun service n\'écoute sur ce port (logistique arrêtée ou mauvais port).',
      host === '127.0.0.1' || host === 'localhost'
        ? 'Si la logistique tourne sur un autre appareil, remplacez localhost par son IP LAN dans backend/.env.'
        : '',
    ].filter(Boolean).join(' ');
  }

  if (isPrivate) {
    return [
      err.message,
      'IP privée : l\'envoi est fait par le backend Node (pas le navigateur).',
      'En dev : frontend via npm run dev (proxy → localhost:3001) et backend local démarré.',
      'Si l\'erreur persiste, la machine logistique est injoignable (IP hotspot changée, pare-feu, service arrêté).',
    ].join(' ');
  }

  return err.message;
};

const fetchWithTimeout = (url, init = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    console.warn(`${LOG} Timeout (${FETCH_TIMEOUT_MS}ms) — abort:`, init.method || 'GET', url);
    controller.abort();
  }, FETCH_TIMEOUT_MS);
  const started = Date.now();
  return fetch(url, { ...init, signal: controller.signal })
    .then((res) => {
      console.log(`${LOG} HTTP ${res.status} en ${Date.now() - started}ms —`, init.method || 'GET', url);
      return res;
    })
    .catch((err) => {
      console.error(`${LOG} fetch() rejeté après ${Date.now() - started}ms —`, init.method || 'GET', url);
      throw err;
    })
    .finally(() => clearTimeout(timer));
};

const authHeaders = (withJsonBody = false) => {
  const h = {};
  if (vlConfig.apiKey) h.Authorization = `Bearer ${vlConfig.apiKey}`;
  if (withJsonBody) h['Content-Type'] = 'application/json';
  return h;
};

const parseResponse = async (response) => {
  const text = await response.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text?.slice(0, 200) };
  }
  return { json, text };
};

const tryRequest = async ({ method, url, body }) => {
  const hasBody = body && !['GET', 'HEAD', 'DELETE'].includes(method);
  const init = {
    method,
    headers: authHeaders(hasBody),
  };
  if (hasBody) {
    init.body = JSON.stringify(body);
  }
  const response = await fetchWithTimeout(url, init);
  const { json, text } = await parseResponse(response);
  return {
    ok: response.ok,
    status: response.status,
    message: json.message || json.error || (text && text.slice(0, 120)) || null,
  };
};

exports.sendEquipmentRequest = async (request) => {
  const plain = toPlainRequest(request);
  const payload = buildPayload(request);

  console.log(`${LOG} sendEquipmentRequest — début`, {
    btpRef: plain.ref,
    btpRequestId: plain.id,
    payload,
  });
  logConfig('sendEquipmentRequest');

  if (!payload.description || payload.description.length < 10) {
    return {
      ok: false,
      error: 'Description manquante ou trop courte pour l\'envoi logistique',
    };
  }
  if (!payload.date) {
    return { ok: false, error: 'Date souhaitée manquante pour l\'envoi logistique' };
  }

  if (!vlConfig.isOutboundEnabled()) {
    const mockRef = `mock-vl-${request.id}-${Date.now()}`;
    console.log(`${LOG} Mode mock — demande simulée (outbound désactivé):`, plain.ref, mockRef);
    return { ok: true, externalId: mockRef, reference: mockRef, mocked: true };
  }

  const url = vlConfig.getRequestUrl();
  if (!url) {
    console.error(`${LOG} URL manquante — VAN_LOGISTIQUE_URL vide dans backend/.env`);
    return { ok: false, error: 'VAN_LOGISTIQUE_URL non définie dans backend/.env' };
  }

  try {
    const bodyStr = JSON.stringify(payload);
    console.log(`${LOG} POST → ${url}`, {
      headers: { ...authHeaders(true), Authorization: vlConfig.apiKey ? '(Bearer présent)' : '(absent)' },
      bodyLength: bodyStr.length,
      body: payload,
    });

    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: authHeaders(true),
      body: bodyStr,
    });

    const { json, text } = await parseResponse(response);
    console.log(`${LOG} Corps réponse (${response.status}):`, {
      preview: text?.slice(0, 500),
      parsed: json,
    });

    if (!response.ok) {
      const errMsg = json.message || json.error || `Erreur ${response.status}: ${text?.slice(0, 200)}`;
      console.error(`${LOG} Réponse HTTP erreur:`, errMsg);
      return { ok: false, error: errMsg };
    }

    const reference =
      json.reference ||
      json.data?.reference ||
      json.externalId ||
      json.id ||
      json.data?.id ||
      null;

    if (!reference) {
      console.error(`${LOG} Réponse 2xx sans reference/id:`, json);
      return { ok: false, error: 'Réponse VAN Logistique sans reference' };
    }

    console.log(`${LOG} Envoi OK — ref logistique:`, reference, '← BTP', plain.ref);
    return { ok: true, externalId: String(reference), reference: String(reference) };
  } catch (err) {
    logFetchError(err, { url, method: 'POST', payload });
    const msg = formatNetworkError(err, url);
    console.error(`${LOG} Erreur envoi (message utilisateur):`, msg);
    return { ok: false, error: msg };
  }
};

/**
 * Annule une solicitation — essaie plusieurs routes jusqu'à succès.
 */
exports.cancelEquipmentRequest = async (reference) => {
  console.log(`${LOG} cancelEquipmentRequest — début`, { reference });
  logConfig('cancelEquipmentRequest');

  if (!reference) {
    return { ok: false, error: 'Référence logistique manquante' };
  }

  if (!vlConfig.isOutboundEnabled()) {
    console.log(`${LOG} Mode mock — annulation simulée:`, reference);
    return { ok: true, mocked: true };
  }

  const attempts = vlConfig.getCancelAttempts(reference);
  if (!attempts.length) {
    return { ok: false, error: 'Aucune URL d\'annulation configurée' };
  }

  const failures = [];

  for (const attempt of attempts) {
    try {
      console.log(`[VAN LOGISTIQUE] Annulation — ${attempt.label}: ${attempt.method} ${attempt.url}`);
      const result = await tryRequest(attempt);

      if (result.ok) {
        console.log(`[VAN LOGISTIQUE] Annulation OK (${attempt.label}) — ${reference}`);
        return { ok: true, via: attempt.label };
      }

      failures.push(`${attempt.label} → ${result.status}${result.message ? ` (${result.message})` : ''}`);

      if (![404, 405, 400].includes(result.status)) {
        break;
      }
    } catch (err) {
      logFetchError(err, { url: attempt.url, method: attempt.method, payload: attempt.body });
      failures.push(`${attempt.label} → ${err.message}`);
    }
  }

  const last = failures[0] || 'aucune réponse';
  console.error(`${LOG} Annulation échouée:`, { reference, failures });
  return {
    ok: false,
    error: `Impossible d'annuler chez VAN Logistique (réf. ${reference}). ${last}`,
    details: failures.join(' | '),
  };
};

exports.isEnabled = () => vlConfig.isOutboundEnabled();

exports.getConfigHint = () => ({
  url: vlConfig.getRequestUrl() || '(non défini)',
  enabled: vlConfig.enabled,
  hasApiKey: Boolean(vlConfig.apiKey),
});
