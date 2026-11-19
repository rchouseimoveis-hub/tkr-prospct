import { getActor, methodNotAllowed } from './_db.js';
export default async function handler(req,res){
  if(!['GET','POST'].includes(req.method)) return methodNotAllowed(res,['GET','POST']);
  try { if(!await getActor(req)) return res.status(401).json({error:'Não autorizado.'}); } catch(error) { return res.status(503).json({error:'Não foi possível validar a sessão.'}); }
  const input=req.method==='GET'?req.query:(req.body||{}); const cep=String(input.cep||'').replace(/\D/g,'');
  if(!/^\d{8}$/.test(cep)) return res.status(400).json({error:'CEP inválido. Informe oito dígitos.'});
  try {
    const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(8000)});
    if(!response.ok) return res.status(502).json({error:'Serviço de CEP indisponível.'});
    const endereco=await response.json(); if(endereco.erro) return res.status(404).json({error:'CEP não encontrado.'});
    return res.status(200).json({sucesso:true,cep_consultado:endereco,total:0,leads:[],aviso:'O CEP identifica endereço e região, não empresas. Nenhuma empresa ou contato fictício foi criado.'});
  } catch(error){return res.status(502).json({error:'Falha ao consultar CEP. Tente novamente.'});}
}
