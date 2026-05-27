/**
 * Configuration VAN Logistique — lire uniquement backend/.env
 */

const trim = (v) => (v || '').trim();

const url = trim(process.env.VAN_LOGISTIQUE_URL).replace(/\/$/, '');
const requestPath = trim(process.env.VAN_LOGISTIQUE_REQUEST_PATH);

const getOrigin = () => {
  const m = url.match(/^(https?:\/\/[^/]+)/);
  return m ? m[1] : '';
};

module.exports = {
  url,
  apiKey: trim(process.env.VAN_LOGISTIQUE_API_KEY),
  enabled: trim(process.env.VAN_LOGISTIQUE_ENABLED).toLowerCase() === 'true',
  requestPath,
  cancelMethod: (trim(process.env.VAN_LOGISTIQUE_CANCEL_METHOD) || 'DELETE').toUpperCase(),

  getRequestUrl() {
    if (!this.url) return '';
    if (!this.requestPath) return this.url;
    const path = this.requestPath.startsWith('/') ? this.requestPath : `/${this.requestPath}`;
    return `${this.url}${path}`;
  },

  isOutboundEnabled() {
    return this.enabled && Boolean(this.url);
  },

  /**
   * Liste des tentatives d'annulation (la première qui répond 2xx gagne).
   * Surcharge : VAN_LOGISTIQUE_CANCEL_URL + VAN_LOGISTIQUE_CANCEL_METHOD
   */
  getCancelAttempts(reference) {
    if (!reference) return [];

    const refRaw = String(reference).trim();
    const refEncoded = encodeURIComponent(refRaw);
    const createUrl = this.getRequestUrl();
    const origin = getOrigin();
    const solicitationsBase = origin ? `${origin}/api/solicitations` : '';

    const customUrl = trim(process.env.VAN_LOGISTIQUE_CANCEL_URL);
    if (customUrl) {
      const url = customUrl
        .replace('{reference}', refRaw)
        .replace('{referenceEncoded}', refEncoded);
      return [
        {
          label: 'VAN_LOGISTIQUE_CANCEL_URL',
          method: this.cancelMethod,
          url,
          body:
            ['POST', 'PATCH', 'PUT'].includes(this.cancelMethod)
              ? { reference: refRaw, status: 'cancelled', decision: 'cancelled' }
              : null,
        },
      ];
    }

    const patchBody = {
      reference,
      status: 'cancelled',
      decision: 'cancelled',
      statut: 'annulé',
    };

    const attempts = [];

    if (createUrl) {
      attempts.push(
        { label: 'DELETE sur URL création + ref', method: 'DELETE', url: `${createUrl}/${refRaw}`, body: null },
        { label: 'PATCH sur URL création + ref', method: 'PATCH', url: `${createUrl}/${refRaw}`, body: patchBody },
        { label: 'POST .../cancel', method: 'POST', url: `${createUrl}/cancel`, body: { reference } },
        { label: 'POST .../annuler', method: 'POST', url: `${createUrl}/annuler`, body: { reference } },
      );
    }

    if (solicitationsBase) {
      attempts.push(
        { label: 'DELETE /api/solicitations/{ref}', method: 'DELETE', url: `${solicitationsBase}/${refRaw}`, body: null },
        { label: 'PATCH /api/solicitations/{ref}', method: 'PATCH', url: `${solicitationsBase}/${refRaw}`, body: patchBody },
        { label: 'POST /api/solicitations/cancel', method: 'POST', url: `${solicitationsBase}/cancel`, body: { reference: refRaw } },
        { label: 'POST /api/solicitations/annuler', method: 'POST', url: `${solicitationsBase}/annuler`, body: { reference: refRaw } },
        { label: 'DELETE /api/solicitations/api-solicitations/{ref}', method: 'DELETE', url: `${solicitationsBase}/api-solicitations/${refRaw}`, body: null },
      );
    }

    return attempts;
  },
};
