import { getActor, methodNotAllowed } from './_db.js';
export default async function handler(req,res){
  if(req.method!=='GET') return methodNotAllowed(res,['GET']);
  try { if(!await getActor(req)) return res.status(401).json({error:'Não autorizado.'}); } catch(error) { return res.status(503).json({error:'Não foi possível validar a sessão.'}); }
  const cnpj=String(req.query.cnpj||'').replace(/\D/g,''); if(!/^\d{14}$/.test(cnpj)) return res.status(400).json({error:'CNPJ inválido.'});
  try {
    const response=await fetch(`https://minhareceita.org/${cnpj}`,{signal:AbortSignal.timeout(10000)});
    if(!response.ok) return res.status(404).json({error:'CNPJ não encontrado ou serviço indisponível.'});
    const data=await response.json();
    return res.status(200).json({razao_social:data.razao_social,nome_fantasia:data.nome_fantasia,situacao_cadastral:{situacao_cadastral:data.descricao_situacao_cadastral},porte_empresa:{descricao:data.porte},descricao_natureza_juridica:data.natureza_juridica,endereco:{tipo_logradouro:data.descricao_tipo_de_logradouro||'',logradouro:data.logradouro,numero:data.numero,bairro:data.bairro,cep:data.cep,municipio:data.municipio,uf:data.uf},telefone:data.ddd_telefone_1||'',email:data.email||''});
  } catch(error){return res.status(502).json({error:'Falha ao consultar base de CNPJ.'});}
}
