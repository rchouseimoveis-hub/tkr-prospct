import { verifyToken } from './_db.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const cnpj = String(req.query.cnpj || '').replace(/\D/g, '');
  if (cnpj.length !== 14) return res.status(400).json({ error: 'CNPJ inválido' });

  try {
    const response = await fetch(`https://minhareceita.org/${cnpj}`);
    if (!response.ok) return res.status(404).json({ error: 'CNPJ não encontrado' });
    const data = await response.json();

    return res.status(200).json({
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia,
      situacao_cadastral: { situacao_cadastral: data.descricao_situacao_cadastral },
      porte_empresa: { descricao: data.porte },
      descricao_natureza_juridica: data.natureza_juridica,
      endereco: {
        tipo_logradouro: data.descricao_tipo_de_logradouro || '',
        logradouro: data.logradouro,
        numero: data.numero,
        bairro: data.bairro,
        cep: data.cep,
        municipio: data.municipio,
        uf: data.uf
      },
      telefone: data.ddd_telefone_1 || '',
      email: data.email || ''
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar base CNPJ' });
  }
}
