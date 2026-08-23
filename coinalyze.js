/* =====================================================================
   api/coinalyze.js — rota temporária para a medição de liquidações
   =====================================================================
   POR QUE EXISTE

   `api.coinalyze.net` não devolve cabeçalho de origem cruzada. A tentativa
   direta do Safari falha com "Load failed" antes de a chamada sair do
   navegador — não é chave errada, é o navegador bloqueando. Mesma situação
   do FRED (v89) e do GDELT (v104).

   ROTA TEMPORÁRIA, E ISSO É PROPOSITAL

   Diferente de `fred.js` e `gdelt.js`, esta rota NÃO lê a chave de variável
   de ambiente: ela recebe a chave do cliente e repassa. Motivo: a medição é
   isolada e provavelmente descartável. Instalar chave permanente na Vercel
   para um teste que pode não ir a lugar nenhum é sujeira que fica.

   O QUE ISSO CUSTA, dito com clareza: a chave viaja do navegador até esta
   rota (por HTTPS) e daí à Coinalyze. É aceitável para uma chave gratuita,
   de leitura, sem valor financeiro. NÃO seria aceitável para chave paga ou
   com permissão de escrita.

   SE AS LIQUIDAÇÕES ENTRAREM NO SISTEMA DE VERDADE, esta rota é reescrita
   no padrão do `fred.js`: `COINALYZE_API_KEY` em variável de ambiente, e o
   cliente deixa de conhecer a chave.

   LISTA BRANCA: sem ela, qualquer um poderia usar este domínio como proxy
   para qualquer caminho da Coinalyze. A lista está aqui, versionada com o
   servidor, e não vem do cliente.

   INSTALAÇÃO
   1. salvar como `api/coinalyze.js` (ao lado de `fred.js` e `gdelt.js`)
   2. commit → a Vercel publica
   3. a página de medição passa a chamar `/api/coinalyze?...`
   ===================================================================== */

export const config = { maxDuration: 30 };

const BASE = "https://api.coinalyze.net/v1";

/* só o que a medição precisa. Acrescentar caminho aqui é decisão de código,
   não de quem chama. */
const CAMINHOS = [
  "liquidation-history",
  "long-short-ratio-history",
  "open-interest-history",
  "funding-rate-history",
  "ohlcv-history",
  "future-markets"
];

const INTERVALOS = ["1min","5min","15min","30min","1hour","2hour",
                    "4hour","6hour","12hour","daily"];

export default async function handler(req, res) {
  const t0 = Date.now();
  const { caminho, symbols, interval, from, to, convert_to_usd, api_key } = req.query;

  if (!CAMINHOS.includes(caminho))
    return res.status(400).json({ error: "caminho não permitido", aceitos: CAMINHOS });
  if (!api_key || String(api_key).length < 8)
    return res.status(400).json({ error: "api_key ausente" });

  /* Validação dos parâmetros ANTES de sair daqui: a Coinalyze cobra do
     orçamento de 40 chamadas/min por símbolo, e mandar pedido malformado
     gasta o limite para receber 400 de volta. */
  const q = new URLSearchParams();
  if (caminho !== "future-markets") {
    if (!symbols || !/^[A-Za-z0-9_.,-]{3,200}$/.test(symbols))
      return res.status(400).json({ error: "symbols inválido" });
    q.set("symbols", symbols);
    if (caminho.endsWith("-history")) {
      if (!INTERVALOS.includes(interval))
        return res.status(400).json({ error: "interval inválido", aceitos: INTERVALOS });
      if (!/^\d{9,11}$/.test(String(from||"")) || !/^\d{9,11}$/.test(String(to||"")))
        return res.status(400).json({ error: "from/to devem ser timestamp UNIX em segundos" });
      q.set("interval", interval); q.set("from", String(from)); q.set("to", String(to));
    }
    if (convert_to_usd === "true") q.set("convert_to_usd", "true");
  }

  const url = BASE + "/" + caminho + (q.toString() ? "?" + q.toString() : "");
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  const BACKOFF = [0, 3000];
  const PRAZO = 12000;
  const tentativas = [];

  try {
    let r = null, ultimoStatus = 0, ultimoErro = null;

    for (let i = 0; i < BACKOFF.length; i++) {
      if (BACKOFF[i]) await espera(BACKOFF[i]);
      const tA = Date.now();
      const controle = new AbortController();
      const corta = setTimeout(() => controle.abort(), PRAZO);
      try {
        r = await fetch(url, {
          signal: controle.signal,
          headers: {
            /* a chave vai no CABEÇALHO daqui para a Coinalyze — só o trecho
               navegador→rota usa parâmetro de URL, para evitar a verificação
               prévia do navegador */
            "api_key": String(api_key),
            "User-Agent": "SEIOS-Cripto/1.0 (instrumento pessoal de pesquisa)",
            "Accept": "application/json"
          }
        });
        ultimoStatus = r.status;
        tentativas.push((i+1) + ":" + r.status + "@" + (Date.now()-tA) + "ms");
        if (r.ok) break;
        /* 401 é chave errada e 400 é parâmetro errado: nenhum dos dois
           melhora com uma segunda tentativa, e insistir gasta o limite */
        if (r.status !== 429 && r.status !== 503) break;
        r = null;
      } catch (e) {
        const causa = e && e.cause;
        ultimoErro = { nome: e && e.name, msg: e && e.message,
                       codigo: causa ? (causa.code || String(causa)) : null };
        tentativas.push((i+1) + ":" + (ultimoErro.codigo || ultimoErro.nome) + "@" + (Date.now()-tA) + "ms");
        r = null;
      } finally { clearTimeout(corta); }
    }

    res.setHeader("X-SEIOS-Tentativas", tentativas.join(" · "));
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));

    if (!r || !r.ok) {
      if (ultimoStatus === 401)
        return res.status(401).json({ error: "chave recusada pela Coinalyze",
          dica: "confira em coinalyze.net/account/api-key/", tentativas });
      if (ultimoStatus === 429) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({ error: "limite de 40 chamadas/min atingido", tentativas });
      }
      if (ultimoStatus === 400)
        return res.status(400).json({ error: "Coinalyze recusou os parâmetros (400)",
          url_tentada: url.replace(/api_key=[^&]*/, "api_key=***"), tentativas });
      if (ultimoErro)
        return res.status(504).json({ error: "não foi possível falar com a Coinalyze",
          causa: ultimoErro.codigo || ultimoErro.nome, tentativas });
      return res.status(502).json({ error: "Coinalyze respondeu " + ultimoStatus, tentativas });
    }

    const texto = await r.text();
    let dados;
    try { dados = JSON.parse(texto); }
    catch (e) {
      return res.status(502).json({ error: "resposta não-JSON da Coinalyze",
                                    inicio: texto.slice(0, 120) });
    }

    /* medição roda poucas vezes; cache curto evita repetir chamada em
       recarregamento acidental sem mascarar dado novo */
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
    res.setHeader("X-SEIOS-Fonte", "coinalyze");
    return res.status(200).json(dados);

  } catch (e) {
    return res.status(500).json({ error: "falha fora do laço: " + (e && e.message), tentativas });
  }
}
