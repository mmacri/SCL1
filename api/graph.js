let cachedToken = null;
let cachedExpiry = 0;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function getGraphToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) return cachedToken;

  const tenantId = env('GRAPH_TENANT_ID');
  const clientId = env('GRAPH_CLIENT_ID');
  const clientSecret = env('GRAPH_CLIENT_SECRET');

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams();
  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'client_credentials');
  body.set('scope', 'https://graph.microsoft.com/.default');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph token error: ${text}`);
  }
  const json = await res.json();
  cachedToken = json.access_token;
  cachedExpiry = now + ((json.expires_in || 3600) - 60) * 1000;
  return cachedToken;
}

async function graphRequest(path, options = {}) {
  const token = await getGraphToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph error: ${text}`);
  }
  return res.json();
}

export async function listGroups(groupIds = []) {
  if (!groupIds.length) return [];
  const filter = groupIds.map((id) => `id eq '${id}'`).join(' or ');
  const data = await graphRequest(`/groups?$filter=${encodeURIComponent(filter)}&$select=id,displayName`);
  return data.value || [];
}

export async function listGroupMembers(groupId) {
  const data = await graphRequest(`/groups/${groupId}/members?$select=id,displayName,mail,userPrincipalName`);
  return data.value || [];
}

export async function findUserByEmail(email) {
  const data = await graphRequest(`/users?$filter=${encodeURIComponent(`mail eq '${email}' or userPrincipalName eq '${email}'`)}&$select=id,displayName,mail,userPrincipalName`);
  return data.value?.[0] || null;
}

export async function addUserToGroup(groupId, userId) {
  await graphRequest(`/groups/${groupId}/members/$ref`, {
    method: 'POST',
    body: JSON.stringify({
      '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
    })
  });
  return true;
}
