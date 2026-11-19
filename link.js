import crypto from 'node:crypto';
import { getSupabase, getActor, methodNotAllowed } from './_db.js';
export default async function handler(req,res) {
  if(req.method!=='POST') return methodNotAllowed(res,['POST']);
  try {
    const actor=await getActor(req); if(!actor||actor.role!==1) return res.status(403).json({error:'Acesso negado.'});
    const db=getSupabase(); const {id,rotate}=req.body||{};
    const {data:target,error}=await db.from('tkr_users').select('id,access_link,access_link_expires_at').eq('id',id).maybeSingle();
    if(error) throw error; if(!target) return res.status(404).json({error:'Usuário não encontrado.'});
    let code=target.access_link;
    const expiry=target.access_link_expires_at ? new Date(target.access_link_expires_at) : new Date(0);
    if(!code||rotate||expiry<=new Date()){code=crypto.randomBytes(32).toString('base64url');const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();const {error:updateError}=await db.from('tkr_users').update({access_link:code,access_link_expires_at:expiresAt}).eq('id',id);if(updateError)throw updateError;}
    return res.status(200).json({url:`${process.env.APP_URL || `https://${req.headers.host}`}/?k=${code}`});
  } catch(error){return res.status(400).json({error:error.message||'Falha ao gerar link.'});}
}
