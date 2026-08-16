/* =====================================================================
   harness-v101.js — o último ponto de uma série precisa ser um período
   FECHADO
   =====================================================================
   Contra a v100 este arquivo falha inteiro: `soPeriodosFechados` não existe
   lá, e os três consumidores leem o dia em formação. O que ele prova é que
   a régua é UMA — data < hoje (UTC) — e que ela chegou aos três lugares.

   Uso:  node harness-v101.js index.html
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
function fonteDe(nome){
  const i = HTML.indexOf("function " + nome + "(");
  if(i === -1) throw new Error("sem função " + nome + " (é a v100 ou anterior?)");
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome);
  return bloco(i) + ";";
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    fonteDe("dataUTCDe"), fonteDe("hojeUTC"), fonteDe("soPeriodosFechados"),
    fonteDe("diasEntreDatas"), fonteDe("janelaCalendario"),
    constDe("BRUTO_PLAUSIVEL"), fonteDe("brutoValido"),
    "return { dataUTCDe, hojeUTC, soPeriodosFechados, janelaCalendario, brutoValido, BRUTO_PLAUSIVEL };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,m){ if(Math.abs(a-b)>1e-9) throw new Error((m||"")+" "+a+" ≠ "+b); }
function estoura(fn,m){ let d=false; try{ fn(); }catch(e){ d=true; } if(!d) throw new Error(m||"deveria falhar"); }

/* congela o relógio, como o harness-v99 */
function em(iso, fn){
  const real = Date.now;
  Date.now = () => new Date(iso).getTime();
  try { return fn(); } finally { Date.now = real; }
}
function dias(n, fim, valorDe){
  // série ASC de n dias diários terminando em `fim`
  const out = [];
  let d = new Date(fim + "T00:00:00Z");
  for(let i = 0; i < n; i++){
    const ds = d.toISOString().slice(0,10);
    out.unshift({ date: ds, value: valorDe ? valorDe(i) : 100 });
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

console.log("\nBLOCO A — a régua: hoje ainda não fechou");

t("o ponto de hoje sai; o de ontem fica", ()=>{
  const s = dias(3, "2026-08-16");            // 14, 15, 16
  const f = em("2026-08-16T23:59:00Z", ()=> API.soPeriodosFechados(s));
  eq(f.length, 2, "pontos fechados:");
  eq(f[f.length-1].date, "2026-08-15", "último fechado:");
});

t("não depende da HORA — às 00:01 ou às 23:59 o dia corrente segue aberto", ()=>{
  const s = dias(3, "2026-08-16");
  ["2026-08-16T00:01:00Z", "2026-08-16T12:00:00Z", "2026-08-16T23:59:00Z"].forEach(function(iso){
    eq(em(iso, ()=> API.soPeriodosFechados(s)).length, 2, iso + ":");
  });
});

t("ponto com data no FUTURO também é descartado", ()=>{
  const s = dias(3, "2026-08-20");
  eq(em("2026-08-16T12:00:00Z", ()=> API.soPeriodosFechados(s)).length, 0, "fechados:");
});

t("série sem nenhum ponto de hoje passa inteira", ()=>{
  const s = dias(5, "2026-08-14");
  eq(em("2026-08-16T12:00:00Z", ()=> API.soPeriodosFechados(s)).length, 5);
});

t("entrada vazia ou sem data não estoura", ()=>{
  eq(API.soPeriodosFechados([]).length, 0);
  eq(API.soPeriodosFechados(null).length, 0);
  eq(API.soPeriodosFechados([{ value: 1 }, null]).length, 0, "ponto sem data:");
});

t("dataUTCDe converte o timestamp em segundos do mempool", ()=>{
  eq(API.dataUTCDe(Date.parse("2026-08-15T18:30:00Z")), "2026-08-15");
});

console.log("\nBLOCO B — o defeito medido: o bucket aberto muda o sinal");

t("hash rate: o dia em formação empurra a variação para baixo, e sozinho", ()=>{
  /* 91 dias fechados subindo 0,1%/dia, mais o bucket de hoje com metade dos
     blocos observados. A conta da v100 (primeiro vs último do lote) enxerga
     queda; a da v101, alta. */
  // `dias()` numera i=0 no ponto MAIS RECENTE — para uma série que sobe com o
  // tempo, o expoente é negativo. (A primeira versão deste teste errou o sinal
  // e acusou o código; o código estava certo.)
  const s = dias(91, "2026-08-15", i => 100 * Math.pow(1.001, -i));
  s.push({ date: "2026-08-16", value: s[s.length-1].value * 0.5 });
  const v100 = ((s[s.length-1].value - s[0].value) / s[0].value) * 100;
  const fechados = em("2026-08-16T12:00:00Z", ()=> API.soPeriodosFechados(s))
    .sort((a,b)=> a.date < b.date ? 1 : -1);
  const j = API.janelaCalendario(fechados, 90);
  const v101 = ((fechados[0].value - j.ponto.value) / j.ponto.value) * 100;
  if(!(v100 < 0)) throw new Error("o teste não reproduz o defeito: v100 deu " + v100);
  if(!(v101 > 0)) throw new Error("a correção não inverteu o sinal: v101 deu " + v101);
  eq(j.dias, 90, "janela medida:");
});

t("GDELT: o dia parcial derruba a média recente — a direção do viés é fixa", ()=>{
  const cheio = Array(14).fill(1000);
  const comAberto = cheio.slice(0, 13).concat([400]);   // dia pela metade
  const media = a => a.reduce((x,y)=>x+y,0)/a.length;
  const spike = function(vals){
    const n = Math.max(2, Math.floor(vals.length*0.15));
    return (media(vals.slice(-n)) / media(vals.slice(0, vals.length-n)) - 1) * 100;
  };
  const comLixo = spike(comAberto);
  const semLixo = spike(comAberto.slice(0, -1));
  if(!(comLixo < -20)) throw new Error("o teste não reproduz o defeito: " + comLixo);
  if(Math.abs(semLixo) > 1e-9) throw new Error("descartar o aberto deveria zerar o pico: " + semLixo);
});

console.log("\nBLOCO C — a régua chegou aos três consumidores");

t("hash rate passa por soPeriodosFechados E por janelaCalendario", ()=>{
  const f = semComentarios(fonteDe("fetchHashrateTrend"));
  if(!/soPeriodosFechados/.test(f)) throw new Error("continua lendo o bucket aberto");
  if(!/janelaCalendario\(fechados, 90\)/.test(f)) throw new Error("janela ainda contada por registro");
  if(/series\[series\.length-1\]\.avgHashrate/.test(f)) throw new Error("a conta da v100 sobreviveu");
});

t("o hash rate agora tem faixa de plausibilidade, como manda a v100", ()=>{
  if(!API.BRUTO_PLAUSIVEL["onchain.hashrate"]) throw new Error("sem faixa declarada");
  estoura(()=> API.brutoValido("onchain.hashrate", -99), "queda impossível passou");
  eq(API.brutoValido("onchain.hashrate", -10.8), -10.8, "leitura real:");
});

t("o CoinMetrics devolve só dias fechados", ()=>{
  const f = semComentarios(fonteDe("fetchCoinMetricsOnchain"));
  if(!/soPeriodosFechados/.test(f)) throw new Error("o dia em formação continua chegando ao MVRV");
  if(!/CoinMetrics sem dia fechado/.test(f)) throw new Error("série sem dia fechado não falha");
});

t("NENHUMA janela de 90d é contada por índice de registro", ()=>{
  /* esta asserção é sobre o arquivo inteiro, de propósito: foi ela que
     encontrou o quarto caso (ouro/PAXG), que nem eu nem as auditorias
     tínhamos listado. Se um quinto nascer, quebra aqui. */
  const limpo = semComentarios(HTML);
  const porRegistro = [...limpo.matchAll(/\w+\[Math\.max\(0, \w+\.length\s*-\s*9\d\)\]/g)];
  if(porRegistro.length)
    throw new Error(porRegistro.length + " janela(s) ainda contada(s) em registros: " +
                    porRegistro.map(m=>m[0]).join(", "));
  if(!/janelaCalendario\(addrObs, 90\)/.test(limpo))
    throw new Error("endereços ativos não passam pela janela de calendário");
  if(!/janelaCalendario\(velas, 90\)/.test(limpo))
    throw new Error("o ouro não passa pela janela de calendário");
});

t("endereços ativos falham SOZINHOS: janela curta não derruba o MVRV junto", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("janelaCalendario(addrObs, 90)");
  const trecho = limpo.slice(i - 600, i + 900);
  if(!/catch\(eAddr\)/.test(trecho)) throw new Error("sem catch próprio");
  if(!/setFailed\("onchain","activeAddresses"/.test(trecho))
    throw new Error("a falha própria não marca a fonte");
});

t("o GDELT descarta o último bucket, e exige amostra para isso", ()=>{
  const f = semComentarios(fonteDe("fetchGdeltVolumeSpike"));
  if(!/todos\.slice\(0, -1\)/.test(f)) throw new Error("o bucket aberto continua na conta");
  if(!/todos\.length < 5/.test(f)) throw new Error("descarta sem checar o tamanho da amostra");
});

console.log("\nBLOCO D — o que muda de valor muda de modelo");

t("MODEL_VERSION saiu do m5 — três indicadores votantes mudaram de valor", ()=>{
  const m = /const MODEL_VERSION = "([^"]+)"/.exec(HTML);
  if(m[1].indexOf("m5") === 0)
    throw new Error("continua m5: hash rate, endereços e volume mudam de valor sem bump");
});

t("o BUILD também", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.100-/.test(m[1])) throw new Error("continua a v100: " + m[1]);
});

t("a mudança sai NA TELA, com o antes e o depois", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("await fetchHashrateTrend()");
  const trecho = limpo.slice(i, i + 900);
  if(!/comparaJanela/.test(trecho))
    throw new Error("o hash rate muda de valor sem mostrar o valor antigo");
  if(!/dia em formação/.test(trecho)) throw new Error("a nota não diz o que ficou de fora");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v101 verde — nenhum período aberto vota.");
