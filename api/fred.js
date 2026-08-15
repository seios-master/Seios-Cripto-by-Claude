/* =====================================================================
   SEIOS — proxy próprio para o FRED
   =====================================================================
   Arquivo: api/fred.js  (na raiz do repositório, dentro da pasta api/)
   Vira automaticamente:  https://SEU-DOMINIO/api/fred

   POR QUE ISTO EXISTE
   O navegador não pode chamar o FRED direto: o FRED não envia cabeçalho
   CORS. Até aqui a saída era passar por um intermediário público gratuito
   (allorigins.win / corsproxy.io) — com dois problemas:

     1. A chave de API ia DENTRO da URL, atravessando servidor de terceiro.
     2. O intermediário é grátis, sem contrato, e engasga sob carga. Foi ele,
        provavelmente, quem derrubou o SP500 em 3 de 6 backtests num sábado.

   Aqui a chamada é servidor→servidor, onde CORS não existe. A chave vive
   como variável de ambiente da Vercel e nunca chega ao navegador.

   PRÉ-REQUISITO
   Painel da Vercel → Settings → Environment Variables:
       FRED_API_KEY = sua chave
   Marcar Production, Preview e Development.
   ===================================================================== */

/* Só estas séries passam. Sem isto, o endpoint viraria um proxy aberto para
   o FRED usando a SUA chave — qualquer um poderia consumir sua cota. A lista
   é exatamente o que o SEIOS consome hoje; série nova exige editar aqui, o
   que é uma trava saudável e não um estorvo. */
const SERIES_PERMITIDAS = new Set([
  // macro
  "DFF", "CPIAUCSL", "M2SL", "DTWEXBGS", "T10Y2Y",
  // ativos globais
  "DCOILWTICO", "DEXUSEU", "SP500", "PCOPPUSDM", "VIXCLS", "DGS10",
  // geopolítico
  "USEPUINDXD",
  // sensores exploratórios (peso zero)
  "DFII10", "WALCL", "WTREGEN", "RRPONTSYD", "NFCI"
]);

/* Parâmetros aceitos. Qualquer outro é descartado em silêncio — inclusive
   api_key, que é justamente o que NÃO pode vir do cliente. */
const PARAMS_PERMITIDOS = new Set([
  "observation_start", "observation_end", "limit", "sort_order",
  "output_type", "realtime_start", "realtime_end", "frequency", "units"
]);

const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

// espera entre tentativas — o FRED costuma responder na segunda
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function buscarComRetry(url, tentativas = 3) {
  let ultimoErro = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "SEIOS/1.0 (instrumento pessoal)" }
      });
      clearTimeout(timer);

      // 5xx é falha do outro lado: vale tentar de novo.
      // 4xx é erro nosso: repetir não conserta, devolve logo.
      if (res.status >= 500) {
        ultimoErro = new Error("FRED devolveu " + res.status);
        await sleep(400 * (i + 1));
        continue;
      }
      return res;
    } catch (e) {
      ultimoErro = e;
      await sleep(400 * (i + 1));
    }
  }
  throw ultimoErro || new Error("falha desconhecida");
}

module.exports = async (req, res) => {
  // a resposta é dado público do Fed; liberar leitura simplifica o teste e a
  // transição de domínio. O que é secreto é a chave, e ela nunca sai daqui.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "GET") {
    res.status(405).json({ erro: "método não permitido" });
    return;
  }

  const chave = process.env.FRED_API_KEY;
  if (!chave) {
    res.status(500).json({
      erro: "FRED_API_KEY não configurada",
      comoResolver: "Vercel → Settings → Environment Variables → FRED_API_KEY, e refazer o deploy"
    });
    return;
  }

  const seriesId = (req.query.series_id || "").trim().toUpperCase();
  if (!seriesId) {
    res.status(400).json({ erro: "informe series_id", exemplo: "/api/fred?series_id=DFF" });
    return;
  }
  if (!SERIES_PERMITIDAS.has(seriesId)) {
    res.status(403).json({
      erro: "série não está na lista permitida",
      series_id: seriesId,
      permitidas: Array.from(SERIES_PERMITIDAS).sort()
    });
    return;
  }

  const url = new URL(FRED_BASE);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", chave);
  url.searchParams.set("file_type", "json");
  Object.keys(req.query).forEach((k) => {
    if (PARAMS_PERMITIDOS.has(k) && req.query[k] !== "") {
      url.searchParams.set(k, String(req.query[k]));
    }
  });

  const inicio = Date.now();
  try {
    const r = await buscarComRetry(url.toString());
    const texto = await r.text();

    if (!r.ok) {
      res.status(r.status).json({
        erro: "FRED recusou a consulta",
        status: r.status,
        series_id: seriesId,
        // devolve o começo da resposta pra diagnóstico, sem vazar a URL (que tem a chave)
        detalhe: texto.slice(0, 300)
      });
      return;
    }

    /* Cache na borda da Vercel. Série macro muda no máximo uma vez por dia;
       reconsultar a cada backtest é desperdício e é o que aproxima do limite
       de cota. stale-while-revalidate serve o valor antigo na hora enquanto
       busca o novo por trás — a tela nunca espera. */
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("X-SEIOS-Fonte", "fred-direto");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - inicio));
    res.status(200).send(texto);
  } catch (e) {
    res.status(502).json({
      erro: "não consegui falar com o FRED",
      series_id: seriesId,
      motivo: String(e && e.message || e),
      tentativas: 3,
      ms: Date.now() - inicio
    });
  }
};
