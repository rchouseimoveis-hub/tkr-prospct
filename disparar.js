import { getActor, methodNotAllowed } from './_db.js';
export default async function handler(req,res){
  if(req.method!=='POST') return methodNotAllowed(res,['POST']);
  let user; try { user=await getActor(req); } catch(error) { return res.status(503).json({error:'Não foi possível validar a sessão.'}); }
  if(!user) return res.status(401).json({error:'Não autorizado.'});
  if(user.role===3) return res.status(403).json({error:'Consultores não possuem permissão para disparos em massa.'});
  const {canal,leads,mensagem,assunto}=req.body||{};
  if(!['whatsapp','email'].includes(canal)) return res.status(400).json({error:'Canal inválido.'});
  if(!Array.isArray(leads)||!leads.length||leads.length>100) return res.status(400).json({error:'Selecione de 1 a 100 leads por lote.'});
  if(typeof mensagem!=='string'||!mensagem.trim()||mensagem.length>5000) return res.status(400).json({error:'Mensagem obrigatória (máximo 5.000 caracteres).'});
  let enviados=0,falhas=0;
  try {
    if(canal==='whatsapp'){
      const url=process.env.WHATSAPP_API_URL,key=process.env.WHATSAPP_API_KEY;
      if(!url||!key) return res.status(503).json({error:'Integração WhatsApp ainda não configurada.'});
      for(const lead of leads){const phone=String(lead.t||'').replace(/\D/g,'');if(phone.length<10){falhas++;continue;}const text=mensagem.replace(/\{empresa\}/gi,lead.e||'').replace(/\{nome\}/gi,(lead.e||'').split(' ')[0]);const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':key},body:JSON.stringify({number:phone.startsWith('55')?phone:'55'+phone,text}),signal:AbortSignal.timeout(15000)});if(r.ok)enviados++;else falhas++;}
    } else {
      const key=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
      if(!key||!from) return res.status(503).json({error:'Integração de e-mail não configurada. Defina RESEND_API_KEY e RESEND_FROM_EMAIL.'});
      for(const lead of leads){if(!lead.em||!String(lead.em).includes('@')){falhas++;continue;}const text=mensagem.replace(/\{empresa\}/gi,lead.e||'').replace(/\{nome\}/gi,(lead.e||'').split(' ')[0]);const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({from,to:[lead.em],subject:assunto||'Apresentação TKR Andrade Consultoria',text}),signal:AbortSignal.timeout(15000)});if(r.ok)enviados++;else falhas++;}
    }
    return res.status(200).json({ok:true,enviados,falhas});
  }catch(error){return res.status(502).json({error:'Falha ao processar disparos. Verifique o provedor.'});}
}
