const axios = require('axios');

async function envoyerViaMeta(message) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN || process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.WHATSAPP_TO;
  if (!token || !phoneNumberId || !to) return { ok: false, raison: 'WhatsApp Cloud API non configure' };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    console.log('[WhatsApp/Meta] Message envoye:', res.data?.messages?.[0]?.id || 'ok');
    return { ok: true, data: res.data };
  } catch (err) {
    const detail = err.response?.data?.error?.message || err.message;
    console.error('[WhatsApp/Meta] Erreur:', detail);
    return { ok: false, raison: detail };
  }
}

async function envoyerViaCallMeBot(message) {
  const phone = process.env.CALLMEBOT_PHONE;
  const apikey = process.env.CALLMEBOT_APIKEY;
  if (!phone || !apikey) return { ok: false, raison: 'CallMeBot non configure' };

  try {
    const encoded = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encoded}&apikey=${apikey}`;
    const res = await axios.get(url, { timeout: 15000 });
    console.log('[WhatsApp/CallMeBot] Reponse:', String(res.data).replace(/\s+/g, ' ').slice(0, 180));
    return { ok: true, data: res.data };
  } catch (err) {
    console.error('[WhatsApp/CallMeBot] Erreur:', err.message);
    return { ok: false, raison: err.message };
  }
}

async function envoyerVia2Chat(message) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const from = process.env.WHATSAPP_FROM;
  const to = process.env.WHATSAPP_TO;
  if (!apiKey || !from || !to) return { ok: false, raison: '2Chat non configure' };

  try {
    const res = await axios.post(
      'https://api.p.2chat.io/open/whatsapp/send-message',
      { to_number: to, from_number: from, text: message },
      { headers: { 'X-User-API-Key': apiKey, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    return { ok: true, data: res.data };
  } catch (err) {
    console.error('[WhatsApp/2Chat] Erreur:', err.message);
    return { ok: false, raison: err.message };
  }
}

async function envoyerNotification(message) {
  if (process.env.WHATSAPP_PROVIDER === 'meta' || process.env.WHATSAPP_CLOUD_TOKEN) return envoyerViaMeta(message);
  if (process.env.WHATSAPP_API_KEY) return envoyerVia2Chat(message);
  if (process.env.CALLMEBOT_APIKEY) return envoyerViaCallMeBot(message);
  console.log('\n[WhatsApp] Notification non envoyee, aucun service configure');
  console.log(message);
  return { ok: false, raison: 'Aucun service WhatsApp configure' };
}

function msgAcceptation(invite) {
  return `ACCEPTE - ${invite.nom}
Code : ${invite.code_secret}
Pays : ${invite.pays} | Couverts : ${invite.nb_couverts}
Date : ${new Date().toLocaleString('fr-FR')}`;
}

function msgRefus(invite) {
  return `REFUS - ${invite.nom}
Code : ${invite.code_secret}
${invite.nb_couverts} place(s) liberee(s) (Pays : ${invite.pays})
Date : ${new Date().toLocaleString('fr-FR')}`;
}

function msgFraude(code_tente, nom_tente, ip) {
  return `ALERTE FRAUDE
Code utilise : ${code_tente}
Nom saisi : ${nom_tente || '(non precise)'}
IP : ${ip}
Date : ${new Date().toLocaleString('fr-FR')}
Verifiez le panneau admin`;
}

function msgEntreeValidee(invite) {
  return `ENTREE VALIDEE - ${invite.nom}
Pays : ${invite.pays} | ${invite.nb_couverts} couvert(s)
Date : ${new Date().toLocaleString('fr-FR')}`;
}

module.exports = { envoyerNotification, msgAcceptation, msgRefus, msgFraude, msgEntreeValidee };
