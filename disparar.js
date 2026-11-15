import { verifyToken } from './_db.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { canal, leads, mensagem, assunto } = req.body || {};
  if (!leads || !leads.length) return res.status(400).json({ error: 'Nenhum lead selecionado.' });

  let enviados = 0;
  let falhas = 0;

  try {
    if (canal === 'whatsapp') {
      const WA_URL = process.env.WHATSAPP_API_URL;
      const WA_KEY = process.env.WHATSAPP_API_KEY;
      if (!WA_URL || !WA_KEY) {
        return res.status(500).json({ error: 'Configure WHATSAPP_API_URL e WHATSAPP_API_KEY na Vercel.' });
      }

      for (const lead of leads) {
        const fone = String(lead.t || '').replace(/\D/g, '');
        if (fone.length < 10) { falhas++; continue; }
        const texto = mensagem.replace(/\{empresa\}/gi, lead.e || '').replace(/\{nome\}/gi, (lead.e || '').split(' ')[0]);

        const r = await fetch(WA_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': WA_KEY },
          body: JSON.stringify({ number: fone.startsWith('55') ? fone : '55' + fone, text: texto })
        });
        if (r.ok) enviados++; else falhas++;
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    } else if (canal === 'email') {
      const RESEND_KEY = process.env.RESEND_API_KEY;
      const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'comercial@tkrconsultoria.com.br';
      if (!RESEND_KEY) {
        return res.status(500).json({ error: 'Configure RESEND_API_KEY na Vercel.' });
      }

      for (const lead of leads) {
        if (!lead.em || !lead.em.includes('@')) { falhas++; continue; }
        const texto = mensagem.replace(/\{empresa\}/gi, lead.e || '').replace(/\{nome\}/gi, (lead.e || '').split(' ')[0]);

        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [lead.em],
            subject: assunto || 'Apresentação Corporativa - TKR Andrade Consultoria',
            text: texto
          })
        });
        if (r.ok) enviados++; else falhas++;
      }
    }

    return res.status(200).json({ ok: true, enviados, falhas });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao processar disparos: ' + err.message });
  }
}
