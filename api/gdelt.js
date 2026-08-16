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

/* v98.2 — TETO DE DURAÇÃO EXPLÍCITO.
   Função de servidor na Vercel morre por padrão em 10 segundos. O GDELT leva
   de 10 a 20 por natureza — ou seja, no padrão ele NUNCA caberia, e a espera
   entre tentativas caberia menos ainda. Sem esta linha, a rota estaria
   condenada a falhar por relógio, não por fonte. */
export const config = { maxDuration: 60 };

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

  /* O 429 EXPLICA PARTE (v98.1) — MAS NÃO TUDO (v104).
     A primeira chamada por esta rota devolveu `GDELT respondeu 429`: limite de
     taxa por IP. Isso era verdade e continua sendo, às vezes. Só que em
     16/08, às 18:30, a mesma rota devolveu

         {"ms":10489,"error":"falha ao consultar o GDELT: fetch failed",
          "causa":"UND_ERR_CONNECT_TIMEOUT"}

     que é OUTRA falha inteiramente: a conexão TCP nunca se estabeleceu. Não
     houve HTTP, não houve status, não houve limite de taxa. E os 10.489 ms
     denunciam o defeito: é UMA tentativa (o tempo de conexão padrão do
     cliente HTTP do Node é ~10s), não duas.

     O DEFEITO, agora corrigido: o laço abaixo tinha `try { fetch } finally {}`
     — sem `catch`. Quando o `fetch` LEVANTA (conexão recusada, DNS, reset,
     tempo de conexão), a exceção escapava do laço inteiro e caía no catch de
     fora. O `BACKOFF` só cobria falhas que devolvem STATUS. Ou seja: a defesa
     existia para o modo de falha raro e não cobria o comum.

     É a quinta aparição da mesma família nesta semana — defesa escrita sem
     medir contra o que ela defende. */
  const espera = (ms) => new Promise(r => setTimeout(r, ms));

  /* v98.3 — O ORÇAMENTO, ESCRITO AO LADO DA DEFESA.
     Teto da função: 60s. Pior caso desta rota, com a correção:
         tentativa 1 (até PRAZO) + espera 4s + tentativa 2 (até PRAZO)
     tom     = 20 + 4 + 20 = 44s
     volume  = 25 + 4 + 25 = 54s
     Ambos cabem. Uma terceira tentativa NÃO cabe — por isso não existe. */
  const BACKOFF = [0, 4000];          // duas tentativas

  /* v98.4 — AS DUAS CONSULTAS NÃO CUSTAM O MESMO.
     O tom varre 3 dias; o volume varre 14. Com o mesmo prazo de 20s, o tom
     passa e o volume estoura. Prazo único para trabalhos de tamanhos
     diferentes é o mesmo erro de fixar 8s para tudo, só que mais fino. */
  const PRAZO = (mode === "timelinevolraw") ? 25000 : 20000;

  /* v104 — o diagnóstico de cada tentativa vai para o cabeçalho e para o
     corpo do erro. Sem isto, "fetch failed" é indistinguível de "429" na
     tela, e as duas pedem respostas opostas: uma é esperar, a outra é rota. */
  const tentativas = [];

  try {
    let r = null, ultimoStatus = 0, ultimoErro = null;

    for (let i = 0; i < BACKOFF.length; i++) {
      if (BACKOFF[i]) await espera(BACKOFF[i]);
      const tA = Date.now();
      const controle = new AbortController();
      const corta = setTimeout(() => controle.abort(), PRAZO);
      try {
        /* v98.2 — IDENTIFICAR-SE.
           `fetch failed` seco, sem status, veio da PRIMEIRA tentativa e rápido
           demais para ser tempo esgotado: é conexão recusada antes de haver
           resposta HTTP. O cliente HTTP do Node se apresenta como "undici" e
           muitos serviços públicos recusam agente desconhecido vindo de
           datacenter — o navegador nunca passou por isso porque sempre mandou
           um User-Agent de gente. Aqui a rota se identifica pelo que é. */
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
           orçamento e o limite de taxa da fonte por nada */
        if (r.status !== 429 && r.status !== 503) break;
        r = null;
      } catch (erroDaTentativa) {
        /* v104 — ESTE `catch` É A CORREÇÃO. Sem ele, tudo que o `fetch`
           levantava abandonava o laço na primeira tentativa. */
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
      res.setHeader("X-SEIOS-Fonte", "gdelt-erro");
      res.setHeader("X-SEIOS-Tentativas", tentativas.join(" · "));
      res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));

      if (ultimoStatus === 429) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({
          error: "GDELT limitou a taxa (429) nas " + BACKOFF.length + " tentativas",
          dica: "limite por IP, janela curta — a próxima leitura provavelmente passa",
          tentativas: tentativas
        });
      }
      /* conexão que nunca se estabeleceu é diagnóstico diferente de resposta
         recusada, e a tela precisa saber a diferença: uma passa com tempo, a
         outra não passa nunca sem trocar de caminho */
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
       porque a idade vai junto: o cliente lê `age` e `x-vercel-cache` e
       imprime no log. Dado velho pode ser útil; dado velho disfarçado de
       novo, não.
       O volume compara os últimos dias contra uma janela de 14 — meia hora de
       cache não muda a leitura. O tom, de 3 dias, é mais sensível. */
    res.setHeader("Cache-Control",
      (mode === "timelinevolraw")
        ? "s-maxage=1800, stale-while-revalidate=86400"
        : "s-maxage=900, stale-while-revalidate=86400");
    res.setHeader("X-SEIOS-Fonte", "gdelt");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    res.setHeader("X-SEIOS-Tentativas", tentativas.join(" · "));
    res.setHeader("X-SEIOS-Buscado-Em", new Date().toISOString());
    return res.status(200).json(dados);

  } catch (e) {
    /* aqui só chega o que NÃO é falha de tentativa — erro de programação,
       basicamente. Se "fetch failed" voltar a aparecer nesta mensagem, o
       `catch` do laço parou de funcionar. */
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
