// Thin wrapper around the Express API.
// Dev: Vite proxies /api → :3100.
// Vercel: same-origin /api (rewritten to EC2). Optional VITE_API_BASE for a direct API host.

const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

let accountEmail = 'default';

export function setAccountEmail(email) {
  accountEmail = String(email || '').trim().toLowerCase() || 'default';
}

export class ApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function req(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Account-Email': accountEmail,
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.detail || data.error || `Request failed (${res.status})`, {
      status: res.status,
      code: data.error,
      data,
    });
  }
  return data;
}

export const api = {
  health: () => req('/api/health'),
  config: () => req('/api/config'),
  autocomplete: (q) => req(`/api/places/autocomplete?q=${encodeURIComponent(q)}`),
  render: (body) => req('/api/render', { method: 'POST', body: JSON.stringify(body) }),
  lead: (body) => req('/api/lead', { method: 'POST', body: JSON.stringify(body) }),
  leads: () => req('/api/leads'),
  renders: () => req('/api/renders'),
  campaigns: () => req('/api/campaigns'),
  createCampaign: (body) => req('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }),
  campaign: (id) => req(`/api/campaigns/${encodeURIComponent(id)}`),
  updateCampaign: (id, body) => req(`/api/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addHome: (id, body) => req(`/api/campaigns/${encodeURIComponent(id)}/homes`, { method: 'POST', body: JSON.stringify(body) }),
  bulkAddHomes: (id, body) => req(`/api/campaigns/${encodeURIComponent(id)}/homes/bulk`, { method: 'POST', body: JSON.stringify(body) }),
  enrichCampaignOwners: (id, body) => req(`/api/campaigns/${encodeURIComponent(id)}/homes/enrich-owners`, { method: 'POST', body: JSON.stringify(body || {}) }),
  updateHome: (homeId, body) => req(`/api/campaigns/homes/${encodeURIComponent(homeId)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  discoverArea: (body) => req('/api/discovery/area', { method: 'POST', body: JSON.stringify(body) }),
  discoverNeighbors: (body) => req('/api/discovery/neighbors', { method: 'POST', body: JSON.stringify(body) }),
  mapsJsConfig: () => req('/api/config/maps-js'),
  quote: (id) => req(`/api/quote/${encodeURIComponent(id)}`),
  quoteSeason: (id, scheme) => req(`/api/quote/${encodeURIComponent(id)}/season`, { method: 'POST', body: JSON.stringify({ scheme }) }),
  signup: (body) => req('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => req('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  creditBalance: () => req('/api/credits/balance'),
  creditPackages: () => req('/api/credits/packages'),
  quoteCredits: (body) => req('/api/credits/quote', { method: 'POST', body: JSON.stringify(body) }),
  purchaseCredits: (body) => req('/api/credits/purchase', { method: 'POST', body: JSON.stringify(body) }),
  confirmCreditPurchase: (body) => req('/api/credits/purchase/confirm', { method: 'POST', body: JSON.stringify(body) }),
  creditTransactions: () => req('/api/credits/transactions'),
  templates: () => req('/api/templates'),
  template: (id) => req(`/api/templates/${encodeURIComponent(id)}`),
  saveTemplate: (body) => req('/api/templates', { method: 'POST', body: JSON.stringify(body) }),
  cloneTemplate: (body) => req('/api/templates/clone', { method: 'POST', body: JSON.stringify(body) }),
  previewTemplate: (id, body) => req(`/api/templates/${encodeURIComponent(id)}/preview`, { method: 'POST', body: JSON.stringify(body) }),
  deleteTemplate: (id) => req(`/api/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  mailEstimate: (body) => req('/api/mail/estimate', { method: 'POST', body: JSON.stringify(body) }),
  mailStatus: () => req('/api/mail/status'),
  verifyCampaignAddresses: (campaignId, body) => req(`/api/mail/campaigns/${encodeURIComponent(campaignId)}/verify-addresses`, { method: 'POST', body: JSON.stringify(body || {}) }),
  verifyQuoteAddresses: (body) => req('/api/mail/renders/verify-addresses', { method: 'POST', body: JSON.stringify(body || {}) }),
  sendQuoteMail: (body) => req('/api/mail/renders/send', { method: 'POST', body: JSON.stringify(body) }),
  sendCampaignMail: (campaignId, body) => req(`/api/mail/campaigns/${encodeURIComponent(campaignId)}/send`, { method: 'POST', body: JSON.stringify(body) }),
  resetCampaignMail: (campaignId) => req(`/api/mail/campaigns/${encodeURIComponent(campaignId)}/reset-mail`, { method: 'POST', body: JSON.stringify({}) }),
};
