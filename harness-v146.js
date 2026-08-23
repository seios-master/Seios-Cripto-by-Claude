/* =====================================================================
   harness-v146.js — a proporção com o denominador ao lado
   =====================================================================
   Sensor e diagnóstico. MODEL_VERSION continua m12, score intocado.

   O QUE A PRIMEIRA COLETA BOA MOSTROU, em 23/08 08:41: "100% vendidos ·
   percentil 92". Cem por cento quer dizer comprados = 0 naquela hora. Isso é
   aperto violento OU hora quase vazia em que o pouco que estourou era tudo de
   um lado — e o painel dizia "VENDIDOS SENDO ESTOURADOS" nos dois casos.

   É a lição do CVD (v124) pelo avesso: lá o defeito era o valor bruto, cuja
   escala muda por ordem de grandeza. A proporção corrigiu aquilo e abriu o
   buraco simétrico — com o total perto de zero, ela vira ruído amplificado
   até o topo da escala.

   O QUE ESTA BUILD NÃO FAZ: filtrar, bloquear ou ajustar leitura. O número
   continua o mesmo. Só passa a vir com o volume da hora em percentil.

   Uso:  node harness-v146.js index.html
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

/* --- a coleta, com talos e histórico controlado ------------------------ */
function coletar(hist){
  const S = { apiKeys:{ coinalyze:"chave-teste" }, market:{} };
  const fn = new Function("S","logStep","logDone","smartFetch","percentilDeApetite",
    declDe("coletarLiquidacoes") + "\nreturn coletarLiquidacoes;")(
    S, ()=>({}), ()=>{},
    async () => ({ ok:true, status:200, json: async()=>([{ history: hist }]) }),
    /* percentil de verdade, simples: fração da base abaixo do valor */
    function(base, v){
      const b = base.filter(x=>typeof x === "number");
      if(!b.length) return null;
      return (b.filter(x=>x < v).length / b.length) * 100;
    });
  return fn({ok:[],fail:[]}).then(()=>S.market.liquidacoes);
}
/* 40 horas gordas + a hora medida + a hora em formação (descartada) */
function historico(ultimaL, ultimaS){
  const h = [];
  for(let i=0;i<40;i++) h.push({ t:i, l: 40e6 + i*1e5, s: 45e6 + i*1e5 });
  h.push({ t:99, l: ultimaL, s: ultimaS });
  h.push({ t:100, l: 1, s: 1 });          // em formação — sai no `pop`
  return h;
}

/* --- o painel ---------------------------------------------------------- */
const API = new Function("S","localStorage","esc",
  [declDe("dobra"), declDe("blocoLiquidacoes"), "return blocoLiquidacoes;"].join("\n"));
function painel(liq){
  return API({ market:{ liquidacoes: liq }, apiKeys:{} }, localStorage, esc)();
}

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
async function ta(n,f){ try{ await f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

(async function(){

console.log("\nBLOCO A — o volume da hora é medido e guardado");

await ta("hora GORDA: volume em percentil alto", async ()=>{
  /* falha contra a v145: lá `pctVolume` não existe. */
  const L = await coletar(historico(0, 300e6));
  if(L.pctVolume === null || L.pctVolume === undefined)
    throw new Error("o volume da hora não é medido");
  if(L.pctVolume < 90) throw new Error("hora de 300M devia estar no topo: " + L.pctVolume);
});

await ta("hora VAZIA com 100% vendidos: volume no fundo", async ()=>{
  /* é o caso literal de 23/08 08:41 — comprados = 0, e a proporção crava
     100 seja o total de 20 mil ou de 200 milhões. */
  const L = await coletar(historico(0, 20e3));
  eq(Math.round(L.proporcaoVendidos), 100, "proporção:");
  if(L.pctVolume > 5) throw new Error("hora de 20 mil devia estar no fundo: " + L.pctVolume);
});

await ta("base curta: volume fica NULO, não vira zero", async ()=>{
  /* `Number(null)` é zero — erro que já cometi duas vezes. Percentil sobre
     punhado de pontos tem que ser ausência declarada, não um número baixo. */
  const curto = [{t:1,l:1e6,s:1e6},{t:2,l:1e6,s:2e6},{t:3,l:1,s:1}];
  const L = await coletar(curto);
  eq(L.pctVolume, null, "volume com base curta:");
  eq(L.pctProporcao, null, "proporção com base curta:");
});

await ta("a proporção NÃO foi alterada pela mudança", async ()=>{
  /* a build não pode ter mexido no número: ela só acrescenta o denominador. */
  const L = await coletar(historico(1e6, 3e6));
  eq(Math.round(L.proporcaoVendidos), 75, "proporção:");
  eq(L.total, 4e6, "total:");
});

console.log("\nBLOCO B — a linha declara o volume, fechada");

t("VOLUME FINO aparece no resumo, em destaque", ()=>{
  const h = painel({ proporcaoVendidos:100, longs:0, shorts:20e3, total:20e3,
                     pctProporcao:92, pctVolume:3, base:164 });
  if(h.indexOf("volume fino") === -1) throw new Error("o resumo não avisa");
  if(h.indexOf("volume fino") > h.indexOf("dobra-corpo"))
    throw new Error("o aviso está dentro do corpo — fechada, não informa");
});

t("volume normal aparece sem alarme", ()=>{
  const h = painel({ proporcaoVendidos:71, longs:30e6, shorts:74e6, total:104e6,
                     pctProporcao:80, pctVolume:64, base:164 });
  if(h.indexOf("volume fino") !== -1) throw new Error("alarme falso");
  if(h.indexOf("volume p64") === -1) throw new Error("não declara o percentil do volume");
});

t("o corpo explica POR QUE 100% de hora fina não é 100% de hora gorda", ()=>{
  const h = painel({ proporcaoVendidos:100, longs:0, shorts:20e3, total:20e3,
                     pctProporcao:92, pctVolume:3, base:164 });
  if(h.indexOf("Volume fino.") === -1) throw new Error("sem o aviso longo");
  if(!/não foi filtrado/.test(h))
    throw new Error("não diz que o número continua intocado");
});

t("o RÓTULO não muda — nada é filtrado", ()=>{
  /* a tentação seria esconder ou neutralizar a leitura. Sensor registra; quem
     lê decide. */
  const h = painel({ proporcaoVendidos:100, longs:0, shorts:20e3, total:20e3,
                     pctProporcao:92, pctVolume:3, base:164 });
  if(h.indexOf("VENDIDOS SENDO ESTOURADOS") === -1)
    throw new Error("a leitura foi suprimida em vez de declarada");
  if(h.indexOf("100%") === -1) throw new Error("o número sumiu");
});

t("sem pctVolume (dado antigo no estado) nada quebra", ()=>{
  const h = painel({ proporcaoVendidos:71, longs:30e6, shorts:74e6, total:104e6,
                     pctProporcao:80, base:164 });
  if(/NaN|undefined|null/.test(h)) throw new Error("vazou valor ausente: " + h.slice(0,300));
  if(h.indexOf("volume fino") !== -1) throw new Error("alarme sem dado de volume");
});

console.log("\nBLOCO C — o diagnóstico traz o denominador");

t("o total e o percentil de volume vão para o diagnóstico", ()=>{
  const d = semComentarios(declDe("relatorioTexto"));
  if(!/total \" \+ mi\(Lq\.total\)/.test(d.replace(/\s+/g," ")))
    throw new Error("o total não é impresso");
  if(!/VOLUME FINO/.test(d)) throw new Error("não marca a hora fina");
  if(!/pctVolume/.test(d)) throw new Error("não lê o percentil do volume");
});

console.log("\nBLOCO D — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  eq(Number(/const MODEL_VERSION = "m(\d+)-/.exec(HTML)[1]), 12, "modelo:");
});
t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.145/.test(m[1])) throw new Error("continua a v145: " + m[1]);
});
t("as liquidações continuam SENSOR — não escrevem em indicador votante", ()=>{
  const d = semComentarios(declDe("coletarLiquidacoes"));
  if(/S\.motors\[/.test(d)) throw new Error("passou a escrever em motor");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v146 verde — a proporção passa a vir com o dinheiro que havia por trás.");
})();
