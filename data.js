import { getSupabase, getActor, methodNotAllowed } from './_db.js';
const clean = (x) => Array.isArray(x) ? x.slice(0, 500) : [];
export default async function handler(req, res) {
  try {
    const actor = await getActor(req); if (!actor) return res.status(401).json({ error: 'Não autorizado.' });
    const db = getSupabase();
    const { data: activeUsers, error: usersError } = await db.from('tkr_users').select('id,name,role,mid,active');
    if (usersError) throw usersError;
    const teamUsers = activeUsers.filter(u => u.id === actor.id || u.mid === actor.id);
    const visibleNames = actor.role === 1 ? null : actor.role === 2 ? teamUsers.map(u => u.name) : [actor.name];
    const visible = (row) => actor.role === 1 || (Boolean(row.cs) && visibleNames.includes(row.cs));
    if (req.method === 'GET') {
      const { data: meta, error: metaError } = await db.from('tkr_meta').select('ver').eq('key', 'sync').maybeSingle();
      if (metaError) throw metaError;
      const ver = meta?.ver || 1;
      if (Number(req.query.v || 0) === ver && Number(req.query.v || 0) !== 0) return res.status(200).json({ same: true, ver });
      const [leadsRes, visitsRes] = await Promise.all([
        db.from('tkr_leads').select('id,cs,payload'), db.from('tkr_visits').select('id,cs,payload')
      ]);
      if (leadsRes.error) throw leadsRes.error; if (visitsRes.error) throw visitsRes.error;
      const users = actor.role === 1 ? activeUsers : actor.role === 2 ? teamUsers : activeUsers.filter(u => u.id === actor.id);
      return res.status(200).json({ ver, leads: leadsRes.data.filter(visible).map(r => r.payload), visits: visitsRes.data.filter(visible).map(r => r.payload), users });
    }
    if (req.method === 'POST') {
      const body = req.body || {}; const leads = body.leads || {}; const visits = body.visits || {};
      const upsert = async (table, change) => {
        const ups = clean(change.up); const dels = clean(change.del);
        for (const item of ups) {
          if (!item || !item.id) throw new Error('Registro sem identificador.');
          if (actor.role !== 1 && (!item.cs || !visibleNames.includes(item.cs))) throw new Error('O registro precisa pertencer a você ou à sua equipe.');
          const { data: old, error } = await db.from(table).select('id,cs').eq('id', item.id).maybeSingle();
          if (error) throw error;
          if (old && !visible(old)) throw new Error('Acesso negado a um registro fora da sua equipe.');
        }
        if (ups.length) {
          const rows = ups.map(item => ({ id: item.id, cs: item.cs || '', payload: item, updated_at: new Date().toISOString() }));
          const { error } = await db.from(table).upsert(rows); if (error) throw error;
        }
        for (const id of dels) {
          if (actor.role === 3) throw new Error('Consultores não podem excluir registros.');
          const { data: old, error } = await db.from(table).select('id,cs').eq('id', id).maybeSingle(); if (error) throw error;
          if (old && !visible(old)) throw new Error('Sem permissão para excluir registro fora da equipe.');
          const { error: deleteError } = await db.from(table).delete().eq('id', id); if (deleteError) throw deleteError;
        }
      };
      await upsert('tkr_leads', leads); await upsert('tkr_visits', visits);
      const { data: meta } = await db.from('tkr_meta').select('ver').eq('key', 'sync').maybeSingle();
      const nextVer = (meta?.ver || 1) + 1;
      const { error: versionError } = await db.from('tkr_meta').upsert({ key: 'sync', ver: nextVer }); if (versionError) throw versionError;
      return res.status(200).json({ ok: true, ver: nextVer });
    }
    return methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) { return res.status(400).json({ error: error.message || 'Falha na sincronização.' }); }
}
