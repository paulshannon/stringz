// Encode/decode a shareable snapshot of the app state to a compact,
// URL-safe string (base64url of JSON), so a board can be linked or bookmarked.
const VERSION = 1;

export function encodeShare(snapshot) {
  return toB64Url(JSON.stringify({ v: VERSION, ...snapshot }));
}

export function decodeShare(str) {
  try {
    const obj = JSON.parse(fromB64Url(str));
    return obj && typeof obj === 'object' ? obj : null;
  } catch {
    return null;
  }
}

// UTF-8-safe base64url helpers.
function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
