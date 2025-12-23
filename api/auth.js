function decodeClientPrincipal(headerValue) {
  if (!headerValue) return null;
  try {
    const json = Buffer.from(headerValue, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function claimMap(principal) {
  const map = new Map();
  (principal?.claims || []).forEach((c) => {
    if (!map.has(c.typ)) map.set(c.typ, []);
    map.get(c.typ).push(c.val);
  });
  return map;
}

export function getUserFromRequest(req) {
  const principal = decodeClientPrincipal(req.headers['x-ms-client-principal']);
  if (!principal) return null;
  const claims = claimMap(principal);
  const emails = claims.get('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') || [];
  const name = claims.get('name')?.[0] || principal.userDetails;
  const groups = claims.get('groups') || [];
  return {
    name,
    email: emails[0] || principal.userDetails,
    groups
  };
}

function splitEnv(name) {
  return (process.env[name] || '').split(',').map((v) => v.trim()).filter(Boolean);
}

export function requireAuth(req, res, next) {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  return next();
}

export function requireAdmin(req, res, next) {
  const user = getUserFromRequest(req);
  const adminEmails = splitEnv('ADMIN_EMAILS');
  const adminGroups = splitEnv('ADMIN_GROUP_IDS');
  const isEmailAdmin = user?.email && adminEmails.includes(user.email);
  const isGroupAdmin = user?.groups?.some((g) => adminGroups.includes(g));
  if (!user || (!isEmailAdmin && !isGroupAdmin)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  return next();
}

export function requirePower(req, res, next) {
  const user = getUserFromRequest(req);
  const adminEmails = splitEnv('ADMIN_EMAILS');
  const adminGroups = splitEnv('ADMIN_GROUP_IDS');
  const powerGroups = splitEnv('POWER_GROUP_IDS');
  const isEmailAdmin = user?.email && adminEmails.includes(user.email);
  const isGroupAdmin = user?.groups?.some((g) => adminGroups.includes(g));
  const isGroupPower = user?.groups?.some((g) => powerGroups.includes(g));
  if (!user || (!isEmailAdmin && !isGroupAdmin && !isGroupPower)) {
    return res.status(403).json({ error: 'Power user access required' });
  }
  req.user = user;
  return next();
}
