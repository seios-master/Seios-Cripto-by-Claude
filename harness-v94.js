/* =====================================================================
   harness-v94.js — uma contagem de observações independentes
   =====================================================================
   Falha inteiro contra a v93: `contagemDaSerie` não existe lá. O que ele
   prova é que os TRÊS lugares que mostram progresso leem da mesma função,
   e que a função conta janela independente (`prox`), não leitura com
   desfecho de 24 h — que é ~3× maior com a rotina de três leituras/dia.

   Uso:  node harness-v94.js index.html
   ===================================================================== */

const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");

function bloco(ini){
  const abre = HTML.indexOf("{", ini);
  let n = 0, str = null, esc = false;
  for(let i = abre; i < HTML.length; i++){
    const c = HTML[i];
    if(esc){ esc = false; continue; }
    if(c === "\\"){ esc = true; continue; }
    if(str){ if(c === str) str = null; continue; }
    if(c === '"' || c === "'" || c === "`"){ str = c; continue; }
    if(c === "{") n++; else if(c === "}"){ n--; if(!n) return HTML.slice(ini, i+1); }
  }
  throw new Error("bloco não fecha");
}
function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("não existe a função " + nome + " (é a v93 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

let API;
try{
  API = new Function([
    fonteDe("contagemDaSerie"),
    fonteDe("maturarRetornos"),
    fonteDe("precoMaisProximoDe"),
    "const TOLERANCIA_RECONSTRUCAO_H = { 1:12, 3:18, 30:48 };",
    "return { contagemDaSerie, maturarRetornos };"
  ].join("\n"))();
}catch(e){
  console.error("FALHA AO MONTAR:", e.message);
  process.exit(1);
}

const H8 = 8 * 3600e3;
function serieDeLeituras(n, precos){
  // três leituras por dia, de 8 em 8 horas — a rotina real do Jorge
  const base = Date.parse("2026-08-01T09:00:00Z");
  const out = [];
  for(let i = 0; i < n; i++){
    out.push({ ts: new Date(base + i*H8).toISOString(),
               preco: precos ? precos[i] : 100 + i,
               retornos: {}, retornosMeta: {} });
  }
  return out;
}

let ok = 0, bad = 0; const falhas = [];
function t(nome, fn){
  try{ fn(); ok++; console.log("  ✓ " + nome); }
  catch(e){ bad++; falhas.push(nome + ": " + e.message); console.log("  ✗ " + nome + "  — " + e.message); }
}
function eq(a,b,m){ if(a !== b) throw new Error((m||"") + " esperado " + b + ", veio " + a); }
function verdade(v,m){ if(!v) throw new Error(m || "esperava verdadeiro"); }

console.log("\nBLOCO A — a contagem conta janela independente, não leitura");

t("N leituras produzem N−1 janelas independentes: a última ainda não fechou", ()=>{
  const s = serieDeLeituras(6);
  API.maturarRetornos(s, 200, Date.parse(s[5].ts) + 3600e3);
  eq(API.contagemDaSerie(s).independentes, 5, "janelas:");
  eq(API.contagemDaSerie(s).leituras, 6, "leituras:");
});

t("nove leituras = 8 janelas independentes, e o dia não é a unidade — dia NÃO é observação", ()=>{
  // nove leituras de 8 em 8h a partir das 09:00 UTC caem em quatro datas
  // civis — o que já é parte do argumento: "dia" não é unidade de amostra.
  const s = serieDeLeituras(9);
  API.maturarRetornos(s, 200, Date.parse(s[8].ts) + 3600e3);
  const c = API.contagemDaSerie(s);
  eq(c.dias, 4, "datas civis tocadas:");
  eq(c.independentes, 8, "janelas:");
  // o diagnóstico da v93 mostraria 4/777 = 0,5%; a verdade é 8/777 = 1,0%
  verdade(Math.abs(c.pctDoAlvo - (8/777)*100) < 1e-9, "percentual do alvo errado: " + c.pctDoAlvo);
});

t("desfecho de 24h é contado à parte, e é ~3× as janelas — por isso não vira amostra", ()=>{
  const s = serieDeLeituras(12);
  const fim = Date.parse(s[11].ts);
  API.maturarRetornos(s, 200, fim + 3600e3);
  // as leituras com 1 dia completo recebem d1 pela reconstrução da própria série
  const c = API.contagemDaSerie(s);
  verdade(c.comD1 > 0, "nenhum d1 apurado — o teste não separa nada");
  verdade(c.comD1 !== c.independentes || c.comD1 === 0,
          "d1 e janelas coincidiram; o teste precisa de séries onde diferem");
});

t("série vazia não estoura e devolve zeros", ()=>{
  const c = API.contagemDaSerie([]);
  eq(c.leituras, 0); eq(c.independentes, 0); eq(c.dias, 0); eq(c.pctDoAlvo, 0);
});

t("nada é aceito sem `prox` numérico — undefined e null não contam", ()=>{
  const s = [{ ts:"2026-08-01T09:00:00Z", preco:100, retornos:{ prox: null } },
             { ts:"2026-08-01T17:00:00Z", preco:101, retornos:{} },
             { ts:"2026-08-02T01:00:00Z", preco:102, retornos:{ prox: 0.5 } }];
  eq(API.contagemDaSerie(s).independentes, 1, "janelas:");
});

console.log("\nBLOCO B — o retorno até a próxima leitura (o `ret8h`)");

t("prox mede de uma leitura à SEGUINTE, e a janela é de 8h", ()=>{
  const s = serieDeLeituras(3, [100, 110, 121]);
  API.maturarRetornos(s, 121, Date.parse(s[2].ts) + 60e3);
  verdade(Math.abs(s[0].retornos.prox - 10) < 1e-9, "prox[0] = " + s[0].retornos.prox);
  verdade(Math.abs(s[1].retornos.prox - 10) < 1e-9, "prox[1] = " + s[1].retornos.prox);
  eq(s[0].retornosMeta.prox.horas, 8, "horas da janela:");
  verdade(s[2].retornos.prox === undefined, "a última não pode ter desfecho ainda");
});

t("as janelas de duas leituras seguidas NÃO se sobrepõem", ()=>{
  const s = serieDeLeituras(3);
  API.maturarRetornos(s, 200, Date.parse(s[2].ts) + 60e3);
  const fim0 = s[0].retornosMeta.prox.tsUsado;
  eq(fim0, s[1].ts, "o fim de uma janela é o início da seguinte:");
});

console.log("\nBLOCO C — os três leitores leem da mesma função");

t("o diagnóstico não divide mais DIAS por 777", ()=>{
  const f = semComentarios(fonteDe("relatorioTexto"));
  if(/\(dias\s*\/\s*777\)/.test(f)) throw new Error("ainda mede progresso em dias");
  if(!/contagemDaSerie\(/.test(f)) throw new Error("não usa a contagem única");
});

t("o painel da série mede os marcos por janela independente", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("const MARCOS");
  if(i === -1) throw new Error("não achei os marcos");
  const trecho = limpo.slice(i - 400, i + 900);
  if(/obs1d\s*>=\s*m\.n/.test(trecho)) throw new Error("os marcos ainda contam desfecho de 24h");
  if(!/contagemDaSerie\(/.test(trecho)) throw new Error("não usa a contagem única");
});

t("some da tela a frase que contradizia o próprio `prox`", ()=>{
  if(/3 leituras por dia ≈ 3 observações\/dia neste horizonte/.test(HTML))
    throw new Error("a frase de 24h continua na tela");
});

t("o rodapé de 'O que já aconteceu' também passa pela contagem única", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("janela(s) independente(s)");
  if(i === -1) throw new Error("não achei o rodapé");
  const trecho = limpo.slice(i - 900, i);
  if(!/contagemDaSerie\(/.test(trecho)) throw new Error("o rodapé ainda filtra por conta própria");
});

console.log("\nBLOCO D — falhou não é expirado, nem no texto");

t("o diagnóstico só carimba EXPIRADO quando a fonte NÃO falhou", ()=>{
  const f = semComentarios(fonteDe("relatorioTexto"));
  if(!/i\.vigente === null && i\.valor !== null && !i\.falhou/.test(f))
    throw new Error("fonte caída ainda aparece como expirada");
});

t("e o carimbo de falha diz que o indicador está fora da conta", ()=>{
  const f = semComentarios(fonteDe("relatorioTexto"));
  if(!/FALHOU, fora da conta/.test(f)) throw new Error("FALHOU não diz que saiu do cálculo");
});

console.log("\nBLOCO E — nenhum nome de função declarado duas vezes");

t("declarações de função no topo do script são únicas", ()=>{
  /* Esta build quase nasceu com DUAS `contarObservacoes`: a minha, nova, e uma
     de IndexedDB que já existia — sem nenhum chamador, o que a deixou invisível.
     A segunda declaração vence por hoisting e a primeira some sem erro nenhum.
     `node --check` não vê, o harness não via, e o checa-campos não via. */
  const limpo = semComentarios(HTML);
  const nomes = [...limpo.matchAll(/^function ([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]);
  const vistos = {}, dup = [];
  nomes.forEach(n=>{ if(vistos[n]) dup.push(n); vistos[n] = 1; });
  if(dup.length) throw new Error("nome declarado 2×: " + [...new Set(dup)].join(", "));
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  " + f)); process.exit(1); }
console.log("v94 verde — uma contagem, três leitores.");
