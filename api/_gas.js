// Gọi Google Apps Script. Tách riêng để api/pf.js, api/remind.js và api/_push.js dùng chung.
function env() {
  return { url: process.env.APPS_SCRIPT_URL || '', token: process.env.APPS_TOKEN || '' };
}

async function gas(payload) {
  const e = env();
  const r = await fetch(e.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({}, payload, { token: e.token })),
    redirect: 'follow',
  });
  return r.json();
}

module.exports = { env, gas };
