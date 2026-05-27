/**
 * Configuration VAN RH — lire uniquement backend/.env
 */

const trim = (v) => (v || '').trim();

const url = trim(process.env.VAN_RH_URL).replace(/\/$/, '');

module.exports = {
  url,

  isConfigured() {
    return Boolean(this.url);
  },
};
