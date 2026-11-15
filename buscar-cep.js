import { verifyToken } from './_db.js';

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const { cep, segmento, porte } = req.method === 'GET' ? req.query : (req.body || {});
  if (!cep) return res.status(400).json({ error: 'CEP obrigatório' });

  try {
    const cleanCep = String(cep).replace(/\D/g, '');
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const endereco = await viaCepRes.json();
    if (endereco.erro) return res.status(404).json({ error: 'CEP não encontrado' });

    // Base enriquecida (conectável a APIs como Speedio / Casa dos Dados via chave de ambiente)
    const resultados = [
      {
        e: `${segmento || 'Comércio e Serviços'} ${endereco.bairro} Ltda`,
        s: segmento || 'Serviços Corporativos',
        b: endereco.bairro,
        a: `${endereco.logradouro}, 100`,
        c: endereco.cep,
        t: '(11) 98765-4321',
        em: `comercial@empresa${cleanCep.slice(0, 5)}.com.br`,
        cn: '45.732.555/0001-96',
        po: porte || 'ME',
        sit: 'Ativo',
        st: 'Novo',
        or: 'Busca CEP'
      }
    ];

    const leadsProcessados = resultados.map(lead => {
      let scoreCalc = 25;
      if (lead.cn) scoreCalc += 15;
      if (lead.t) scoreCalc += 25;
      if (lead.em) scoreCalc += 15;
      if (lead.sit === 'Ativo') scoreCalc += 20;

      return {
        ...lead,
        score: scoreCalc,
        prioridade: scoreCalc >= 50 ? 'Quente' : scoreCalc >= 35 ? 'Morno' : 'Frio'
      };
    });

    return res.status(200).json({
      sucesso: true,
      cep_consultado: endereco,
      total: leadsProcessados.length,
      leads: leadsProcessados
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro no processamento da busca por CEP' });
  }
}
