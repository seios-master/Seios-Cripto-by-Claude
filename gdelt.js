/* =====================================================================
   api/gdelt.js — rota própria para o GDELT, na Vercel
   =====================================================================
   POR QUE ESTA ROTA EXISTE

   `api.gdeltproject.org` não devolve cabeçalho de origem cruzada, então a
   tentativa direta do Safari falha sempre. A rota busca do lado do servidor
   e o navegador consulta a mesma origem. Mesma solução que a v89 deu ao
   FRED. Não há chave: o GDELT é aberto — a rota existe pelo CORS e pela
   estabilidade.

   ---------------------------------------------------------------------
   v125 — POR QUE O CACHE NUNCA ACERTAVA, E POR QUE ISSO IMPORTAVA
   ---------------------------------------------------------------------
   MEDIDO em 19/08/2026: o GDELT falhou em mais da metade das rodadas do dia,
   com 429 (limite de taxa) e 504. O log mostrava `cache MISS` em todas.

   Duas causas, e as duas eram nossas:

   1. TTL INCOMPATÍVEL COM A CADÊNCIA REAL. O `s-maxage` era de 900s (15 min)
      para o tom. O SEIOS coleta 3× por dia, de 8 em 8 horas. O cache SEMPRE
      expirava antes da leitura seguinte — ele nunca serviu para nada no uso
      normal. Só pareceu funcionar em 19/08 porque houve dez coletas seguidas.

   2. FALHA NÃO É CACHEÁVEL. O cache de borda só guarda status 200. Quando o
      GDELT devolvia 429, a rota devolvia 429 e nada era guardado — e o
      `stale-while-revalidate` não tinha o que servir. Cada leitura recomeçava
      do zero contra uma fonte que já estava limitando.

   POR QUE ISSO CONTAMINA AS CONCLUSÕES, e não só a tela:
   quando o GDELT cai, DOIS indicadores saem da conta e a cobertura vai de
   ~73% para ~67%. O modelo deixa a massa ausente no denominador e amortece o
   score na direção de zero — de propósito. Resultado: o MESMO mercado produz
   scores diferentes conforme a fonte responde ou não. Em 777 observações isso
   seria medir a média de dois instrumentos. E se as falhas tiverem horário —
   limite por IP costuma ter — elas se correlacionam com a hora do dia, que se
   correlaciona com o comportamento do mercado. Aí não é ruído: é viés.

   A CORREÇÃO, em duas partes:

   · TTL compatível: 4h para o tom (janela de 3 dias), 6h para o volume
     (janela de 14 dias). Isso derruba as chamadas de ~6/dia para ~1–2/dia.
   · Último valor bom guardado em memória. Quando as tentativas falham, a
     rota devolve o valor guardado com status 200 E a idade declarada, em vez
     de 429. Cobertura para de oscilar; o score volta a ser comparável.

   A RESSALVA, escrita porque contraria uma regra nossa:
   a v93 estabeleceu que "não alcançar é falha, não janela curta em silêncio".
   Aqui um dado de horas atrás entra como resposta. A diferença é que a idade
   vai DECLARADA em `X-SEIOS-Idade-S` e em `_seios.idadeS` no corpo — o
   cliente lê e imprime. Dado velho pode ser útil; dado velho DISFARÇADO de
   novo, não. E a janela do tom é de 3 dias: 4 horas são ~5% dela.

   LIMITE CONHECIDO: a memória de uma função serverless não é compartilhada
   entre instâncias nem sobrevive a um deploy. O guardado é um bônus, não uma
   garantia — quem faz o trabalho pesado é o TTL do cache de borda.

   INSTALAÇÃO
   1. salvar como `api/gdelt.js` na raiz do repositório (ao lado de `fred.js`)
   2. commit → a Vercel publica sozinha
   3. testar: https://seios-master.com/api/gdelt?mode=timelinetone&timespan=3d&set=geo
   ===================================================================== */

/* Função de servidor na Vercel morre por padrão em 10s. O GDELT leva de 10 a
   20 por natureza — no padrão, a rota estaria condenada a falhar por relógio,
   não por fonte. */
export const config = { maxDuration: 60 };

const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

/* As consultas ficam AQUI, não no cliente: query de texto livre vinda do
   navegador transformaria esta rota num proxy aberto, e o dia em que a
   pergunta mudar, ela muda num lugar só, versionada com o servidor. */
const CONSULTAS = {
  geo:    '(war OR conflict OR invasion OR sanctions OR "military strike" OR terrorism OR coup)',
  crise:  '(war OR conflict OR invasion OR sanctions OR "military strike" OR terrorism OR coup OR crash OR collapse OR default OR emergency)'
};

const MODOS    = ["timelinetone", "timelinevolraw"];
const TIMESPAN = /^[0-9]{1,3}[dhm]$/;   // 3d, 14d, 24h — nada além disso

/* v125 — último valor bom por consulta, na memória da instância.
   Chave = mode|set|timespan, para que tom e volume não se sobrescrevam. */
const ULTIMO_BOM = new Map();
const IDADE_MAXIMA_MS = 24 * 3600 * 1000;   // além de 24h, prefere falhar

export default async function handler(req, res) {
  const t0 = Date.now();
  const { mode, timespan, set } = req.query;

  if (!MODOS.includes(mode))
    return res.status(400).json({ error: "mode inválido", aceitos: MODOS });
  if (!CONSULTAS[set])
    return res.status(400).json({ error: "set inválido", aceitos: Object.keys(CONSULTAS) });
  if (!TIMESPAN.test(String(timespan || "")))
    return res.status(400).json({ error: "timespan inválido (ex.: 3d, 14d)" });

  const chave = mode + "|" + set + "|" + timespan;

  const url = BASE
    + "?query="     + encodeURIComponent(CONSULTAS[set])
    + "&mode="      + mode
    + "&format=json"
    + "&timespan="  + timespan;

  const espera = (ms) => new Promise(r => setTimeout(r, ms));

  /* O ORÇAMENTO, AO LADO DA DEFESA. Teto da função: 60s. Pior caso:
       tentativa 1 (até PRAZO) + espera 4s + tentativa 2 (até PRAZO)
     tom    = 20 + 4 + 20 = 44s · volume = 25 + 4 + 25 = 54s
     Ambos cabem. Uma terceira NÃO cabe — por isso não existe. */
  const BACKOFF = [0, 4000];

  /* AS DUAS CONSULTAS NÃO CUSTAM O MESMO: o tom varre 3 dias, o volume 14.
     Prazo único para trabalhos de tamanhos diferentes é o mesmo erro de
     fixar 8s para tudo, só que mais fino. */
  const PRAZO = (mode === "timelinevolraw") ? 25000 : 20000;

  const tentativas = [];

  /* v125 — servir o guardado. Usado nos dois caminhos de falha abaixo. */
  function servirGuardado(motivo) {
    const g = ULTIMO_BOM.get(chave);
    if (!g) return false;
    const idadeS = Math.round((Date.now() - g.em) / 1000);
    if (idadeS * 1000 > IDADE_MAXIMA_MS) return false;   // velho demais: falha honesta
    res.setHeader("X-SEIOS-Fonte", "gdelt-guardado");
    res.setHeader("X-SEIOS-Idade-S", String(idadeS));
    res.setHeader("X-SEIOS-Motivo", motivo);
    res.setHeader("X-SEIOS-Tentativas", tentativas.join(" · "));
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    /* não cacheia na borda: é resposta de contingência, não a verdade da vez */
    res.setHeader("Cache-Control", "no-store");
    /* a idade vai NO CORPO também: cabeçalho some em intermediário, e o
       cliente precisa saber que está lendo dado velho mesmo assim */
    const corpo = (dados => {
      if (dados && typeof dados === "object" && !Array.isArray(dados)) {
        return Object.assign({}, dados, {
          _seios: { guardado: true, idadeS: idadeS, motivo: motivo,
                    buscadoEm: new Date(g.em).toISOString() }
        });
      }
      return { dados: dados, _seios: { guardado: true, idadeS: idadeS, motivo: motivo,
                                       buscadoEm: new Date(g.em).toISOString() } };
    })(g.dados);
    res.status(200).json(corpo);
    return true;
  }

  try {
    let r = null, ultimoStatus = 0, ultimoErro = null;

    for (let i = 0; i < BACKOFF.length; i++) {
      if (BACKOFF[i]) await espera(BACKOFF[i]);
      const tA = Date.now();
      const controle = new AbortController();
      const corta = setTimeout(() => controle.abort(), PRAZO);
      try {
        /* IDENTIFICAR-SE: o cliente HTTP do Node se apresenta como "undici" e
           muitos serviços públicos recusam agente desconhecido vindo de
           datacenter. O navegador nunca passou por isso porque sempre mandou
           um User-Agent de gente. */
        r = await fetch(url, {
          signal: controle.signal,
          headers: {
            "User-Agent": "SEIOS-Cripto/1.0 (instrumento pessoal de pesquisa; contato via github.com/seios-master)",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });
        ultimoStatus = r.status;
        tentativas.push((i+1) + ":" + r.status + "@" + (Date.now()-tA) + "ms");
        if (r.ok) break;
        /* status que NÃO melhora com tempo: para aqui em vez de gastar o
           orçamento e o limite da fonte por nada */
        if (r.status !== 429 && r.status !== 503) break;
        r = null;
      } catch (erroDaTentativa) {
        /* Este `catch` é a correção da v104. Sem ele, tudo que o `fetch`
           levantava abandonava o laço na primeira tentativa: a defesa cobria
           só o modo de falha raro (status) e não o comum (conexão). */
        const causa = erroDaTentativa && erroDaTentativa.cause;
        ultimoErro = {
          nome: erroDaTentativa && erroDaTentativa.name,
          msg:  erroDaTentativa && erroDaTentativa.message,
          codigo: causa ? (causa.code || causa.message || String(causa)) : null
        };
        tentativas.push((i+1) + ":" + (ultimoErro.codigo || ultimoErro.nome || "erro")
                        + "@" + (Date.now()-tA) + "ms");
        r = null;
      } finally { clearTimeout(corta); }
    }

    if (!r || !r.ok) {
      /* v125 — ANTES de devolver erro, tenta o guardado. É esta linha que
         impede a cobertura de oscilar entre leituras. */
      if (servirGuardado(ultimoStatus === 429 ? "429" : "conexao")) return;

      res.setHeader("X-SEIOS-Fonte", "gdelt-erro");
      res.setHeader("X-SEIOS-Tentativas", tentativas.join(" · "));
      res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));

      if (ultimoStatus === 429) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({
          error: "GDELT limitou a taxa (429) nas " + BACKOFF.length + " tentativas",
          dica: "limite por IP, janela curta — e não havia valor guardado nesta instância",
          tentativas: tentativas
        });
      }
      /* conexão que nunca se estabeleceu é diagnóstico diferente de resposta
         recusada: uma passa com tempo, a outra não passa sem trocar de caminho */
      if (ultimoErro) {
        return res.status(504).json({
          ms: Date.now() - t0,
          error: (ultimoErro.nome === "AbortError")
            ? ("GDELT não respondeu em " + (PRAZO/1000) + "s por tentativa, nas " + BACKOFF.length + " tentativas")
            : ("não foi possível CONECTAR ao GDELT nas " + BACKOFF.length + " tentativas — "
               + "a conexão falhou antes de haver resposta HTTP"),
          causa: ultimoErro.codigo,
          tentativas: tentativas,
          url_tentada: url
        });
      }
      return res.status(502).json({ error: "GDELT respondeu " + ultimoStatus,
                                    tentativas: tentativas });
    }

    /* O GDELT às vezes devolve HTML de erro com status 200. Ler como texto e
       tentar o parse aqui evita que o cliente receba lixo com cara de
       sucesso — falha de fonte tem que parecer falha de fonte. */
    const texto = await r.text();
    let dados;
    try { dados = JSON.parse(texto); }
    catch (e) {
      /* v125 — HTML com status 200 também é falha, e também merece o
         guardado. Antes, este caminho devolvia 502 direto. */
      if (servirGuardado("nao-json")) return;
      res.setHeader("X-SEIOS-Fonte", "gdelt-nao-json");
      return res.status(502).json({ error: "GDELT devolveu resposta não-JSON",
                                    inicio: texto.slice(0, 120) });
    }

    /* guarda o bom ANTES de responder: se a próxima chamada falhar, é este
       valor que evita a oscilação de cobertura */
    ULTIMO_BOM.set(chave, { dados: dados, em: Date.now() });

    /* v125 — TTL COMPATÍVEL COM A CADÊNCIA REAL DE COLETA.
       Era 900s (15 min) para o tom e 1800s (30 min) para o volume, com o
       SEIOS lendo de 8 em 8 horas: o cache sempre expirava antes da leitura
       seguinte e nunca serviu para nada.
       Agora: 4h para o tom (janela de 3 dias — 4h são ~5% dela) e 6h para o
       volume (janela de 14 dias). Isso derruba as chamadas ao GDELT de ~6/dia
       para ~1–2/dia, que é a causa raiz do 429.
       `stale-while-revalidate` de 24h mantém a borda respondendo enquanto a
       fonte está fora — e a idade vai no cabeçalho `age`, que o cliente já lê
       e imprime no log. */
    res.setHeader("Cache-Control",
      (mode === "timelinevolraw")
        ? "s-maxage=21600, stale-while-revalidate=86400"    // 6h
        : "s-maxage=14400, stale-while-revalidate=86400");  // 4h
    res.setHeader("X-SEIOS-Fonte", "gdelt");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    res.setHeader("X-SEIOS-Tentativas", tentativas.join(" · "));
    res.setHeader("X-SEIOS-Buscado-Em", new Date().toISOString());
    return res.status(200).json(dados);

  } catch (e) {
    /* aqui só chega o que NÃO é falha de tentativa — erro de programação,
       basicamente. Se "fetch failed" voltar a aparecer nesta mensagem, o
       `catch` do laço parou de funcionar. */
    if (servirGuardado("erro-interno")) return;
    const causa = e && e.cause;
    res.setHeader("X-SEIOS-Fonte", "gdelt-falhou-fora-do-laco");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    return res.status(500).json({
      ms: Date.now() - t0,
      error: "falha fora do laço de tentativas: " + (e && e.message),
      causa: causa ? (causa.code || causa.message || String(causa)) : null,
      tentativas: tentativas
    });
  }
}
