/* =====================================================================
   harness-v147.js — "99%" contra a semana que ele mesmo produziu
   =====================================================================
   Sensor e diagnóstico. MODEL_VERSION continua m12, score intocado.

   MEDIDO em 23/08: duas leituras seguidas com 100% e 99% de vendidos,
   percentis 92 e 90, com o preço parado em −0,22% em 24h. Numa alta
   sustentada — BTC +20% em 30 dias — vendidos apanham hora após hora, e a
   proporção pode viver colada no teto a semana inteira.

   Se for esse o caso, "99%" não é notícia: o percentil 90 quer dizer "um pouco
   acima de um monte de 98%", os cortes de 65 e 40 nunca cruzam, e o painel
   vira mostrador travado no máximo com cara de alarme. É o padrão já medido em
   CVD, funding, endereços ativos e hash rate — escala declarada que não cruza
   na prática. Seria o quinto caso.

   A base de ~164 horas já é baixada para o percentil. Guardar mediana e faixa
   transforma "99%" em "99% numa semana cuja mediana é 97%".

   NADA É FILTRADO. Há teste que falha se a leitura for suprimida.

   Uso:  node harness-v147.js index.html
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
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
const guardado = {};
const localStorage = {
  getItem:k=>Object.prototype.hasOwnProperty.call(guardado,k)?guardado[k]:null,
  setItem:(k,v)=>{guardado[k]=String(v);}, removeItem:k=>{delete guardado[k];}
};
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

function coletar(hist){
  const S = { apiKeys:{ coinalyze:"chave-teste" }, market:{} };
  const fn = new Function("S","logStep","logDone","smartFetch","percentilDeApetite",
    declDe("coletarLiquidacoes") + "\nreturn coletarLiquidacoes;")(
    S, ()=>({}), ()=>{},
    async () => ({ ok:true, status:200, json: async()=>([{ history: hist }]) }),
    function(base, v){
      const b = base.filter(x=>typeof x === "number");
      if(!b.length) return null;
      return (b.filter(x=>x < v).length / b.length) * 100;
    });
  return fn({ok:[],fail:[]}).then(()=>S.market.liquidacoes);
}
/* constrói 40 horas com as proporções pedidas + a hora medida + a em formação */
function historicoDe(props, ultimaProp){
  const h = props.map(function(pr, i){
    const tot = 50e6;
    return { t:i, l: tot*(1-pr/100), s: tot*(pr/100) };
  });
  const tot = 50e6;
  h.push({ t:98, l: tot*(1-ultimaProp/100), s: tot*(ultimaProp/100) });
  h.push({ t:99, l: 1, s: 1 });   // em formação — sai no pop
  return h;
}
const semanaColada = Array.from({length:40}, (_,i)=> 96 + (i % 4));      // 96–99
const semanaAmpla  = Array.from({length:40}, (_,i)=> 20 + (i % 8) * 9);  // 20–83

const API = new Function("S","localStorage","esc",
  [declDe("dobra"), declDe("blocoLiquidacoes"), "return blocoLiquidacoes;"].join("\n"));
const painel = liq => API({ market:{ liquidacoes: liq }, apiKeys:{} }, localStorage, esc)();

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
async function ta(n,f){ try{ await f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

(async function(){

console.log("\nBLOCO A — a semana é medida junto com a hora");

await ta("guarda p10, mediana e p90 da base", async ()=>{
  /* falha contra a v146: lá `dist` não existe. */
  const L = await coletar(historicoDe(semanaAmpla, 71));
  if(!L.dist) throw new Error("a distribuição da base não é guardada");
  ["p10","p50","p90","n"].forEach(function(k){
    if(typeof L.dist[k] !== "number") throw new Error("falta " + k);
  });
  if(!(L.dist.p10 < L.dist.p50 && L.dist.p50 < L.dist.p90))
    throw new Error("os quantis saíram fora de ordem");
});

await ta("SEMANA COLADA NO TETO é reconhecida", async ()=>{
  /* o caso de 23/08: proporção alta o tempo todo. */
  const L = await coletar(historicoDe(semanaColada, 99));
  eq(Math.round(L.proporcaoVendidos), 99, "a hora:");
  if(L.dist.p90 - L.dist.p10 >= 20)
    throw new Error("a amplitude não ficou estreita: " + (L.dist.p90 - L.dist.p10));
  if(Math.round(L.dist.p50) < 95) throw new Error("mediana da semana errada");
});

await ta("SEMANA AMPLA não dispara alarme", async ()=>{
  const L = await coletar(historicoDe(semanaAmpla, 71));
  if(L.dist.p90 - L.dist.p10 < 20)
    throw new Error("amplitude larga foi lida como estreita");
});

await ta("base curta: dist NULA, não objeto vazio", async ()=>{
  const L = await coletar(historicoDe([50,60,70], 65));
  eq(L.dist, null, "dist com base curta:");
});

await ta("a proporção e o volume da v146 continuam intactos", async ()=>{
  const L = await coletar(historicoDe(semanaAmpla, 71));
  eq(Math.round(L.proporcaoVendidos), 71, "proporção:");
  if(L.pctVolume === null || L.pctVolume === undefined)
    throw new Error("o percentil de volume da v146 sumiu");
});

console.log("\nBLOCO B — a linha conta a semana, fechada");

t("a mediana da semana aparece no resumo", ()=>{
  const h = painel({ proporcaoVendidos:99, longs:0.03e6, shorts:2.67e6, total:2.7e6,
                     pctProporcao:90, pctVolume:79, base:164,
                     dist:{p10:96,p50:97,p90:99,n:163} });
  if(h.indexOf("mediana da semana 97%") === -1)
    throw new Error("o resumo não traz a mediana");
  if(h.indexOf("mediana da semana") > h.indexOf("dobra-corpo"))
    throw new Error("está dentro do corpo — fechada, não informa");
});

t("FAIXA ESTREITA é declarada, e explica o que isso invalida", ()=>{
  const h = painel({ proporcaoVendidos:99, longs:0.03e6, shorts:2.67e6, total:2.7e6,
                     pctProporcao:90, pctVolume:79, base:164,
                     dist:{p10:96,p50:97,p90:99,n:163} });
  if(h.indexOf("faixa estreita") === -1) throw new Error("o resumo não marca");
  if(h.indexOf("Faixa estreita.") === -1) throw new Error("sem o aviso longo");
  if(!/65 e 40 nunca cruzam/.test(h)) throw new Error("não diz que os cortes não cruzam");
  if(!/CVD, funding, endereços ativos e hash rate/.test(h))
    throw new Error("não liga ao padrão já medido nos outros quatro");
});

t("faixa larga: mostra os quantis sem alarme", ()=>{
  const h = painel({ proporcaoVendidos:71, longs:30e6, shorts:74e6, total:104e6,
                     pctProporcao:80, pctVolume:64, base:164,
                     dist:{p10:32,p50:58,p90:84,n:163} });
  if(h.indexOf("mediana 58%") === -1) throw new Error("não mostra a faixa");
  if(h.indexOf("Faixa estreita.") !== -1) throw new Error("alarme falso");
});

t("NADA É FILTRADO — o rótulo e o número seguem intactos", ()=>{
  const h = painel({ proporcaoVendidos:99, longs:0.03e6, shorts:2.67e6, total:2.7e6,
                     pctProporcao:90, pctVolume:79, base:164,
                     dist:{p10:96,p50:97,p90:99,n:163} });
  if(h.indexOf("VENDIDOS SENDO ESTOURADOS") === -1)
    throw new Error("a leitura foi suprimida em vez de declarada");
  if(h.indexOf("99%") === -1) throw new Error("o número sumiu");
});

t("estado antigo sem dist não quebra", ()=>{
  const h = painel({ proporcaoVendidos:71, longs:30e6, shorts:74e6, total:104e6,
                     pctProporcao:80, pctVolume:64, base:164 });
  if(/NaN|undefined/.test(h)) throw new Error("vazou valor ausente");
  if(h.indexOf("Faixa estreita.") !== -1) throw new Error("alarme sem dado");
});

console.log("\nBLOCO C — o diagnóstico traz a faixa");

t("p10/mediana/p90 e a marca de faixa estreita vão para o texto", ()=>{
  const d = semComentarios(declDe("relatorioTexto"));
  if(!/Lq\.dist/.test(d)) throw new Error("o diagnóstico não lê a distribuição");
  if(!/FAIXA ESTREITA/.test(d)) throw new Error("não marca a faixa estreita");
  if(!/mediana/.test(d)) throw new Error("não imprime a mediana");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.146/.test(m[1])) throw new Error("continua a v146: " + m[1]);
});
t("as liquidações continuam SENSOR", ()=>{
  const d = semComentarios(declDe("coletarLiquidacoes"));
  if(/S\.motors\[/.test(d)) throw new Error("passou a escrever em motor");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v147 verde — o número de agora passa a vir com a semana que o produziu.");
})();
