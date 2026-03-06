// Ayudas para login con Google (tokens, code, pending_token). Usado por routes/auth.js
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Token temporal para completar registro (el code de Google solo sirve una vez)
const PENDING_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'pending-secret';
const PENDING_EXP_SEC = 300; // 5 min

// Verifica id_token de Google y devuelve payload (email, etc.)
async function verifyGoogleToken(idToken) {
  if (!googleClient) return null;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    return ticket.getPayload();
  } catch (err) {
    console.error('Error verificando token Google:', err.message);
    return null;
  }
}

// Cambia el code del frontend por token de Google (necesita code_verifier por PKCE)
async function exchangeCodeForPayload(code, redirectUri, codeVerifier) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('[auth] Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env');
    return null;
  }
  if (!codeVerifier) {
    console.error('[auth] Falta code_verifier. El frontend tiene que enviarlo.');
    return null;
  }
  try {
    const body = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    });
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();
    const idToken = data.id_token;
    if (!idToken) {
      console.error('[auth] Google no devolvió id_token. redirect_uri:', redirectUri);
      console.error('[auth] Respuesta Google:', JSON.stringify(data));
      return null;
    }
    return verifyGoogleToken(idToken);
  } catch (err) {
    console.error('[auth] Error al cambiar code por token:', err.message);
    return null;
  }
}

// Si hay idToken lo verificamos; si hay code+redirectUri los cambiamos por token
async function getGooglePayload(body) {
  if (body.idToken) return verifyGoogleToken(body.idToken);
  if (body.code && body.redirectUri) {
    return exchangeCodeForPayload(body.code, body.redirectUri, body.code_verifier);
  }
  return null;
}

// Token de un uso: email ya verificado por Google, puede registrarse con username
function createPendingToken(email) {
  const payload = { email, exp: Math.floor(Date.now() / 1000) + PENDING_EXP_SEC };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', PENDING_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

// Verifica pending_token, devuelve { email } o null
function verifyPendingToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  try {
    const expected = crypto.createHmac('sha256', PENDING_SECRET).update(data).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now() / 1000) return null;
    return { email: payload.email };
  } catch (e) {
    return null;
  }
}

module.exports = {
  getGooglePayload,
  createPendingToken,
  verifyPendingToken,
};
