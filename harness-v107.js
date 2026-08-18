/* =====================================================================
   harness-v107.js — quanto de score um ÚNICO dia consegue mover
   =====================================================================
   Contra a v106.1 falha inteiro: `RUIDO_LONGO` e `medirRuidoDaMedida` não
   existem lá, e a pergunta que o censo levantou não tem número.

   O CENSO (18/08) mediu: 24 dos 27 indicadores votantes usam N ≤ 2 pontos
   de dado e somam 78,6% do peso. O `activeAddresses` moveu 114,7 pontos de
   score em 10 horas — 74% de TODO o movimento do sistema naquela janela —
   porque `(hoje − há 90 dias)/há 90 dias` carrega o ruído dos dois dias
   inteiro, e a escala `pct×5` satura em ±20%.

   Esta build NÃO corrige nada. Ela mede, como a v104 mediu o M2 antes de a
   v105 trocar a régua. O que ela precisa provar é que a medição existe, que
   ela não escreve estado nenhum, e que a alternativa medida é de fato
   diferente da atual — senão a v108 nasceria comparando uma coisa com ela
   mesma.

   Uso:  node harness-v107.js index.html
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");
function bloco(ini){
  const abre = HTML.indexOf("{", ini);
  let n=0,str=null,esc=false;
  for(let i=abre;i<HTML.length;i++){
    const c=HTML[i];
    if(esc){esc=false;continue;}
    if(c==="\\"){esc=true;continue;}
    if(str){ if(c===str) str=null; continue; }
    if(c==='"'||c==="'"||c==="`"){ str=c; continue; }
    if(c==="{") n++; else if(c==="}"){ n--; if(!n) return HTML.slice(ini,i+1); }
  }
  throw new Error("bloco não fecha");
}
function declDe(nome){
  let i = HTML.indexOf("async function " + nome + "(");
  if(i === -1) i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v106 ou anterior?)");
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome + " (é a v106 ou anterior?)");
  const abre = HTML.indexOf("{", i), pv = HTML.indexOf(";", i);
  if(abre === -1 || abre > pv) return HTML.slice(i, pv + 1);
  return bloco(i) + ";";
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    declDe("clamp"), declDe("ultimoConhecidoAte"), declDe("trendScoreAtDate"),
    constDe("RUIDO_LONGO"), declDe("mediaAte"), declDe("scoreSuavizadoAtDate"),
    declDe("medirRuidoDaMedida"),
    "return { clamp, trendScoreAtDate, mediaAte, scoreSuavizadoAtDate, medirRuidoDaMedida, RUIDO_LONGO };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,tol,m){ if(Math.abs(a-b)>(tol||1e-9)) throw new Error((m||"")+" "+a+" ≠ "+b); }

/* séries sintéticas: mesma tendência de fundo, ruídos diferentes.
   `dia(i)` gera datas corridas a partir de 2024-01-01. */
function dia(i){ const d = new Date(Date.UTC(2024,0,1)); d.setUTCDate(d.getUTCDate()+i);
  return d.toISOString().slice(0,10); }
function serie(n, fn){ const out=[]; for(let i=0;i<n;i++) out.push({date:dia(i), value:fn(i)}); return out; }
// pseudo-aleatório determinístico — teste não pode depender de Math.random
function ruido(i){ const x = Math.sin(i*12.9898)*43758.5453; return x - Math.floor(x) - 0.5; }

const LISA   = serie(300, i => 1000 * Math.pow(1.0005, i));                    // sobe 0,05%/dia, sem ruído
const RUIDOSA= serie(300, i => 1000 * Math.pow(1.0005, i) * (1 + 0.25*ruido(i))); // ±12,5% de ruído diário

console.log("\nBLOCO A — a medição existe e responde a pergunta do censo");

t("RUIDO_LONGO nasce vazio e declara o próprio erro", ()=>{
  eq(API.RUIDO_LONGO.addr, null, "addr:");
  eq(API.RUIDO_LONGO.hash, null, "hash:");
  eq(API.RUIDO_LONGO.erro, null, "erro:");
});

t("medirRuidoDaMedida devolve a distribuição do |Δ score| de um dia para o outro", ()=>{
  const m = API.medirRuidoDaMedida(RUIDOSA, 5, 90, 7);
  ["n","p50","p90","p95","max","fracMaior15","fracMaior40"].forEach(function(k){
    if(!(k in m.atual)) throw new Error("falta o campo " + k);
    if(!Number.isFinite(m.atual[k])) throw new Error(k + " não é número: " + m.atual[k]);
  });
  if(!(m.atual.n > 100)) throw new Error("amostra pequena demais: " + m.atual.n);
  if(!(m.atual.p50 <= m.atual.p90 && m.atual.p90 <= m.atual.p95 && m.atual.p95 <= m.atual.max))
    throw new Error("os percentis não estão ordenados");
});

t("O TESTE QUE DÓI: na série ruidosa, um dia sozinho move dezenas de pontos", ()=>{
  /* é a reprodução sintética do que Jorge mediu ao vivo: −76,26 → +38,43
     em dez horas, com a leitura crua indo de −15,3% para +7,7% em "90 dias". */
  const m = API.medirRuidoDaMedida(RUIDOSA, 5, 90, 7);
  if(!(m.atual.p95 > 15))
    throw new Error("a série de teste não reproduz o defeito: p95 = " + m.atual.p95.toFixed(1));
  if(!(m.atual.max > 40))
    throw new Error("máximo de " + m.atual.max.toFixed(1) + " — o teste não separa nada");
});

t("na série LISA a mesma fórmula quase não se mexe — o defeito é da série, não da conta", ()=>{
  /* isto impede a conclusão errada de que ponto-a-ponto é sempre ruim:
     `macro.curva` e `macro.juros` também são N≤2 e vivem em séries lisas. */
  const m = API.medirRuidoDaMedida(LISA, 5, 90, 7);
  /* sem esta linha o teste passa contra um stub que devolve zeros — foi o que
     aconteceu na primeira rodada deste harness. Passe vazio é pior que teste
     ausente: ele dá a sensação de cobertura. */
  if(!(m.atual.n > 100)) throw new Error("não mediu nada: n = " + m.atual.n);
  if(!(m.atual.p95 < 1))
    throw new Error("série lisa deveria dar Δ desprezível, deu p95 = " + m.atual.p95.toFixed(2));
});

console.log("\nBLOCO B — a alternativa é de fato DIFERENTE, e é isso que a v108 vai usar");

t("média-contra-média corta o ruído diário da série ruidosa", ()=>{
  const m = API.medirRuidoDaMedida(RUIDOSA, 5, 90, 7);
  if(!(m.suave.p95 < m.atual.p95))
    throw new Error("a alternativa não reduz nada: p95 " + m.suave.p95.toFixed(1) +
                    " vs " + m.atual.p95.toFixed(1) + " — a v108 nasceria comparando com ela mesma");
  if(!(m.suave.p95 < m.atual.p95 * 0.7))
    throw new Error("redução pequena demais para justificar troca de régua: " +
                    (100*(1 - m.suave.p95/m.atual.p95)).toFixed(0) + "%");
});

t("e NÃO corta o sinal de fundo: as duas leem a mesma tendência", ()=>{
  /* o risco da suavização é matar junto o que se queria medir. Na série lisa,
     que é só tendência, as duas réguas têm que concordar. */
  const a = API.trendScoreAtDate(LISA, LISA[LISA.length-1].date, 5, 90);
  const s = API.scoreSuavizadoAtDate(LISA, LISA[LISA.length-1].date, 5, 90, 7);
  if(a === null || s === null) throw new Error("uma das duas não produziu leitura");
  if(Math.abs(a - s) > 3) throw new Error("as réguas discordam na tendência limpa: " + a + " vs " + s);
});

t("a média usa só o passado — nenhuma janela olha para frente", ()=>{
  const meio = LISA[200].date;
  const comFuturo = API.scoreSuavizadoAtDate(LISA, meio, 5, 90, 7);
  const soAteAqui = API.scoreSuavizadoAtDate(LISA.slice(0, 201), meio, 5, 90, 7);
  /* idem: dois `null` são iguais entre si e passariam calados */
  if(comFuturo === null || soAteAqui === null)
    throw new Error("não produziu leitura — o teste não separa nada");
  perto(comFuturo, soAteAqui, 1e-9, "cortar o futuro mudou a leitura:");
});

t("mediaAte não inventa dado onde não há", ()=>{
  eq(API.mediaAte([], "2024-06-01", 7), null, "série vazia:");
  eq(API.mediaAte(LISA, "2023-01-01", 7), null, "data anterior à série:");
  const m = API.mediaAte(LISA, LISA[3].date, 7);
  if(m === null) throw new Error("4 pontos deveriam bastar para uma média de até 7");
});

console.log("\nBLOCO C — é SÓ medição: nada aqui vira score");

t("a medição não escreve em nenhum indicador", ()=>{
  const f = semComentarios(declDe("medirRuidoDaMedida"));
  if(/setAuto|registraIndicador|onchainVals|maps\./.test(f))
    throw new Error("a medição está alimentando o modelo");
});

t("a fórmula que VOTA continua exatamente a mesma", ()=>{
  const limpo = semComentarios(HTML);
  if(!/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/.test(limpo))
    throw new Error("o vivo mudou de fórmula numa build que era só de medição");
  if(!/const addrScore = trendScoreAtDate\(addrSeries, date, 5, 90\)/.test(limpo))
    throw new Error("o backtest mudou de fórmula numa build que era só de medição");
  const f = semComentarios(declDe("trendScoreAtDate"));
  if(!/clamp\(pct\*scaleFactor, -100, 100\)/.test(f))
    throw new Error("trendScoreAtDate foi alterada");
});

t("RUIDO_LONGO é zerado a cada rodada — regra da v99.1", ()=>{
  const limpo = semComentarios(HTML);
  if(!/RUIDO_LONGO\.addr = null; RUIDO_LONGO\.hash = null; RUIDO_LONGO\.erro = null/.test(limpo))
    throw new Error("a medição sobrevive à rodada seguinte e vira memória de erro corrigido");
});

t("a medição não derruba a calibração se falhar", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("medirRuidoDaMedida(addrSeries");
  if(i === -1) throw new Error("a medição não roda sobre os endereços ativos");
  const trecho = limpo.slice(i - 400, i + 700);
  if(!/catch\(eRuido\)\{ RUIDO_LONGO\.erro/.test(trecho))
    throw new Error("sem catch próprio: a medição fora do ar mataria a calibração inteira");
  if(!/medirRuidoDaMedida\(hashSeries/.test(trecho))
    throw new Error("o hash rate ficou de fora — é o outro N=2 da mesma fonte");
});

console.log("\nBLOCO D — o que a tela diz, e o que ela se recusa a dizer");

t("a tabela exige amostra antes de aparecer", ()=>{
  const limpo = semComentarios(HTML);
  if(!/RUIDO_LONGO\.addr\.atual\.n < 60/.test(limpo))
    throw new Error("a distribuição apareceria com meia dúzia de dias");
});

t("a tela mostra as duas réguas e os percentis medidos", ()=>{
  const limpo = semComentarios(HTML);
  ["Ruído da medida", "Régua atual (ponto a ponto)", "Alternativa (média 7d contra média 7d)",
   "% dos dias"].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("falta na tela: " + s);
  });
});

t("a tela NÃO promete que a alternativa prevê melhor", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("Ruído da medida");
  const trecho = limpo.slice(i, i + 3500);
  if(!/não<\/strong> afirma|não afirma/.test(trecho))
    throw new Error("a medição apareceria como promessa de previsão");
  if(!/pode muito bem ser não|a resposta pode/.test(trecho))
    throw new Error("não admite que o resultado pode ser negativo");
});

t("a tela declara que ruído baixo NÃO absolve quem tem N≤2 em série lisa", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("Ruído da medida");
  const trecho = limpo.slice(i, i + 3500);
  if(!/série lisa|cadência/.test(trecho))
    throw new Error("a tela deixaria concluir que os outros N≤2 estão testados, e eles não estão");
});

console.log("\nBLOCO E — build de medição não muda modelo");

t("MODEL_VERSION continua m9 — nenhum score mudou de valor", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(!m) throw new Error("MODEL_VERSION fora do formato mN-data");
  if(Number(m[1]) < 9) throw new Error("modelo regrediu para m" + m[1]);
  if(Number(m[1]) > 9)
    throw new Error("m" + m[1] + ": a v107 é build de MEDIÇÃO e não pode bumpar — " +
                    "bump zera a contagem das 777 sem que nada tenha mudado de valor");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.106/.test(m[1])) throw new Error("continua a v106: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v107 verde — o ruído da medida tem número.");
