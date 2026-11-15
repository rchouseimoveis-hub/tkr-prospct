import { supabase, signToken, hashPassword } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  const { email, password, link } = req.body || {};

  if (link) {
    const { data: user } = await supabase
      .from('tkr_users')
      .select('*')
      .eq('access_link', link)
      .eq('active', true)
      .single();

    if (!user) return res.status(401).json({ error: 'Link inválido ou revogado.' });
    return res.status(200).json({
      token: signToken(user),
      user: { id: user.id, name: user.name, role: user.role, mid: user.mid }
    });
  }

  const cleanEmail = String(email || '').trim().toLowerCase();
  const { data: user } = await supabase
    .from('tkr_users')
    .select('*')
    .eq('email', cleanEmail)
    .single();

  if (!user || !user.active) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  const valid = user.password_hash === password || user.password_hash === hashPassword(password);
  if (!valid) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }

  return res.status(200).json({
    token: signToken(user),
    user: { id: user.id, name: user.name, role: user.role, mid: user.mid }
  });
}
