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

  /* O 429 EXPLICA TUDO (v98.1).
     A primeira chamada por esta rota devolveu `GDELT respondeu 429`: limite de
     taxa por IP. É a resposta que o "Load failed" escondia — o navegador via
     uma falha de rede genérica porque a chamada morria no CORS ou no
     intermediário público antes de o status chegar. Nunca foi instabilidade
     misteriosa do GDELT: era ele dizendo "devagar", e ninguém escutando.

     Duas defesas, aqui no servidor, onde o cliente não precisa saber:
     · espera e tenta de novo, com intervalo crescente — o limite do GDELT é
       por janela curta, então esperar resolve o que insistir não resolve;
     · cache de borda longo: com 15 minutos de `s-maxage` e um dia de
       `stale-while-revalidate`, três leituras diárias batem no GDELT poucas
       vezes por dia em vez de a cada clique. Menos pedido é o único jeito
       honesto de não levar 429. */
  const espera = (ms) => new Promise(r => setTimeout(r, ms));
  /* v98.3 — O ORÇAMENTO PASSOU A SER O PROBLEMA.
     Três tentativas de 25s com esperas de 6s e 12s somam até 93 segundos: mais
     que o teto de 60 da função. Quando o GDELT ficava lento, a própria rota
     era morta pelo relógio da Vercel e devolvia 504 — a defesa contra a falha
     virando a causa da falha, que é o mesmo erro da v55 (prazo de 8s matando o
     GDELT) numa camada acima.
     Agora o pior caso cabe: 2 × 20s + 5s de espera = 45s, com folga. */
  const BACKOFF = [0, 5000];          // duas tentativas, orçamento de 45s

  try {
    let r = null, ultimoStatus = 0;

    for (let i = 0; i < BACKOFF.length; i++) {
      if (BACKOFF[i]) await espera(BACKOFF[i]);
      /* O GDELT leva de 10 a 20 segundos por natureza — o prazo aqui é
         generoso de propósito. Prazo curto foi o que matou o motor na v55. */
      const controle = new AbortController();
      const corta = setTimeout(() => controle.abort(), 20000);
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
      } finally { clearTimeout(corta); }
      ultimoStatus = r.status;
      if (r.ok) break;
      if (r.status !== 429 && r.status !== 503) break;  // só espera pelo que passa com tempo
      r = null;
    }

    if (!r || !r.ok) {
      res.setHeader("X-SEIOS-Fonte", "gdelt-erro");
      res.setHeader("X-SEIOS-Tentativas", String(BACKOFF.length));
      res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
      if (ultimoStatus === 429) {
        res.setHeader("Retry-After", "60");
        return res.status(429).json({
          error: "GDELT limitou a taxa (429) nas " + BACKOFF.length + " tentativas",
          dica: "limite por IP, janela curta — a próxima leitura provavelmente passa"
        });
      }
      return res.status(502).json({ error: "GDELT respondeu " + ultimoStatus });
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
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=86400");
    res.setHeader("X-SEIOS-Fonte", "gdelt");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    res.setHeader("X-SEIOS-Buscado-Em", new Date().toISOString());
    return res.status(200).json(dados);

  } catch (e) {
    /* "fetch failed" sozinho não diz nada — a causa real mora em `e.cause`
       (ECONNREFUSED, ENOTFOUND, ECONNRESET, certificado...). Esconder isso
       custou uma rodada inteira de adivinhação. Erro legível vale mais que
       erro raro. */
    const causa = e && e.cause;
    res.setHeader("X-SEIOS-Fonte", "gdelt-falhou");
    res.setHeader("X-SEIOS-Ms", String(Date.now() - t0));
    return res.status(504).json({
      ms: Date.now() - t0,
      error: (e && e.name === "AbortError")
        ? "GDELT não respondeu em 20s por tentativa"
        : "falha ao consultar o GDELT: " + (e && e.message),
      causa: causa ? (causa.code || causa.message || String(causa)) : null,
      url_tentada: url
    });
  }
}
