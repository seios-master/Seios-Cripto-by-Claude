/* =====================================================================
   api/gdelt.js — rota própria para o GDELT, na Vercel
   =====================================================================
   POR QUE ESTA ROTA EXISTE

   O GDELT era a única fonte do SEIOS que dependia INTEIRAMENTE de proxy
   CORS público. `api.gdeltproject.org` não devolve cabeçalho de origem
   cruzada, então a tentativa direta do Safari falha sempre — é o
   "Load failed" que aparece no log — e a chamada só se salva se algum
   intermediário público responder. Quando eles engasgam, dois motores
   caem juntos: Geopolítico (tom) e Eventos (volume), 10% do peso nominal.

   É exatamente o problema que a v89 resolveu para o FRED, e a mesma
   solução: o servidor busca, o navegador consulta a mesma origem.

   INSTALAÇÃO
   1. salvar este arquivo como `api/gdelt.js` na raiz do repositório
      (ao lado de `api/fred.js`)
   2. commit → a Vercel publica sozinha
   3. testar no navegador:
      https://seios-master.com/api/gdelt?mode=timelinetone&timespan=3d&set=geo
      deve devolver JSON. `mode` fora da lista é recusado.

   Não há chave de API: o GDELT é aberto. A rota existe pelo CORS e pela
   estabilidade, não por segredo.
   ===================================================================== */

const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

/* As duas consultas do SEIOS ficam AQUI, não no cliente. Motivo: query de
   texto livre vinda do navegador transformaria esta rota num proxy aberto
   para qualquer busca — e o dia em que a pergunta mudar, ela muda num
   lugar só, versionada junto com o servidor. */
const CONSULTAS = {
  geo:    '(war OR conflict OR invasion OR sanctions OR "military strike" OR terrorism OR coup)',
  crise:  '(war OR conflict OR invasion OR sanctions OR "military strike" OR terrorism OR coup OR crash OR collapse OR default OR emergency)'
};

const MODOS    = ["timelinetone", "timelinevolraw"];
const TIMESPAN = /^[0-9]{1,3}[dhm]$/;   // 3d, 14d, 24h — nada além disso

export default async function handler(req, res) {
  const t0 = Date.now();
  const { mode, timespan, set } = req.query;

  if (!MODOS.includes(mode))
    return res.status(400).json({ error: "mode inválido", aceitos: MODOS });
  if (!CONSULTAS[set])
    return res.status(400).json({ error: "set inválido", aceitos: Object.keys(CONSULTAS) });
  if (!TIMESPAN.test(String(timespan || "")))
    return res.status(400).json({ error: "timespan inválido (ex.: 3d, 14d)" });

  const url = BASE
    + "?query="     + encodeURIComponent(CONSULTAS[set])
    + "&mode="      + mode
    + "&format=json"
    + "&timespan="  + timespan;

  try {
    /* O GDELT leva de 10 a 20 segundos por natureza — o prazo aqui é
       generoso de propósito. Prazo curto foi o que matou o motor na v55. */
    const controle = new AbortController();
    const corta = setTimeout(() => controle.abort(), 45000);
    const r = await fetch(url, { signal: controle.signal });
    clearTimeout(corta);

    if (!r.ok) {
      res.setHeader("X-SEIOS-Fonte", "gdelt-erro");
      return res.status(502).json({ error: "GDELT respondeu " + r.status });
    }

    /* O GDELT às vezes devolve HTML de erro com status 200. Ler como texto
       e tentar o parse aqui evita que o cliente receba lixo com cara de
       sucesso — falha de fonte tem que parecer falha de fonte. */
    const texto = await r.text();
    let dados;
    try { dados = JSON.parse(texto); }
    catch (e) {
      res.setHeader("X-SEIOS-Fonte", "gdelt-nao-json");
      return res.status(502).json({ error: "GDELT devolveu resposta não-JSON",
                                    inicio: texto.slice(0, 120) });
    }

    /* Cache curto de borda. `stale-while-revalidate` faz a rota continuar
       respondendo enquanto o GDELT está fora — mas isso só é aceitável
       porque a idade vai junto: `X-SEIOS-Idade-S` diz há quantos segundos
       o dado foi buscado, e o cliente conta a validade a partir daí.
       Dado velho pode ser útil; dado velho disfarçado de novo, não. */
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.setHeader("X-SEIOS-Fonte", "gdelt");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    res.setHeader("X-SEIOS-Buscado-Em", new Date().toISOString());
    return res.status(200).json(dados);

  } catch (e) {
    res.setHeader("X-SEIOS-Fonte", "gdelt-falhou");
    return res.status(504).json({
      error: (e && e.name === "AbortError")
        ? "GDELT não respondeu em 45s"
        : "falha ao consultar o GDELT: " + (e && e.message)
    });
  }
}
