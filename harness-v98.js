/* =====================================================================
   harness-v98.js — o GDELT deixa de depender de intermediário público,
   e o replay declara o que não conseguiu testar
   ===================================================================== */
const fs = require("fs");
const HTML = fs.readFileSync(process.argv[2] || "index.html", "utf8");
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
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
  if(i === -1) throw new Error("sem função " + nome);
  return bloco(i);
}
let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }

console.log("\nBLOCO A — o GDELT tem rota própria (v98)");

t("nenhuma chamada do cliente aponta para api.gdeltproject.org", ()=>{
  const limpo = semComentarios(HTML);
  const diretas = [...limpo.matchAll(/["'`]https:\/\/api\.gdeltproject\.org/g)];
  if(diretas.length) throw new Error(diretas.length + " chamada(s) direta(s) restante(s) — vão cair no proxy público");
});

t("as duas leituras passam pela mesma origem", ()=>{
  const limpo = semComentarios(HTML);
  ["fetchGdeltTone", "fetchGdeltVolumeSpike"].forEach(function(fn){
    const f = semComentarios(fonteDe(fn));
    if(!/GDELT_ROTA/.test(f)) throw new Error(fn + " não usa a rota própria");
    if(/gdeltproject/.test(f)) throw new Error(fn + " ainda monta a URL externa");
  });
});

t("a query não viaja do cliente — a rota não é proxy aberto", ()=>{
  const limpo = semComentarios(HTML);
  if(/query=\$\{query\}/.test(limpo)) throw new Error("o cliente ainda monta a busca");
  if(/military strike/.test(limpo)) throw new Error("a consulta continua no cliente");
});

t("a rota própria nunca vai para proxy público", ()=>{
  const f = semComentarios(fonteDe("urlProprioServidor"));
  if(!/charAt\(0\) === "\/"/.test(f)) throw new Error("a regra de rota própria mudou");
  // GDELT_ROTA começa com "/" — é o que garante o desvio
  if(!/const GDELT_ROTA = "\/api\/gdelt"/.test(HTML)) throw new Error("GDELT_ROTA não começa com /");
});

t("o prazo da rota própria é maior que o do servidor esperando o GDELT", ()=>{
  const limpo = semComentarios(HTML);
  const m = /padrao: \/\^\\\/api\\\/gdelt\/i,\s*direto: (\d+)/.exec(limpo);
  if(!m) throw new Error("sem regra de prazo para a rota própria");
  if(Number(m[1]) <= 45000) throw new Error("prazo do cliente (" + m[1] + "ms) menor que o do servidor (45000ms): o cliente desiste antes da resposta chegar");
});

console.log("\nBLOCO B — o replay declara o que não testou");

t("o relatório mede a cobertura real dia a dia", ()=>{
  const limpo = semComentarios(HTML);
  if(!/coberturaReplay\.push\(completeness\)/.test(limpo)) throw new Error("não acumula cobertura");
  if(!/scoresReplay\.push\(score\)/.test(limpo)) throw new Error("não acumula os scores");
});

t("os acumuladores nascem antes do laço e não vazam entre rodadas", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("const coberturaReplay = [], scoresReplay = []");
  const j = limpo.indexOf("for(let i=50; i<closes.length-forwardDays; i++)");
  if(i === -1) throw new Error("não achei a declaração");
  if(!(i < j)) throw new Error("declarados dentro do laço — zerariam a cada dia");
});

t("o bloco de dimensão não testada só aparece quando um corte é inalcançável", ()=>{
  const limpo = semComentarios(HTML);
  if(!/DIMENSÃO NÃO TESTADA/.test(limpo)) throw new Error("o aviso não existe");
  if(!/if\(!foraDoAlcance\.length\) return ""/.test(limpo))
    throw new Error("o aviso apareceria mesmo com os cortes atingidos — vira ruído");
});

t("o aviso diz o que invalida, e diz que ausência de teste não é erro", ()=>{
  if(!/não sobrevivem\s*\n?\s*a esta correção/.test(HTML) && !/não sobrevivem/.test(HTML))
    throw new Error("não declara o que fica invalidado");
  if(!/ausência de teste/.test(HTML))
    throw new Error("não separa 'não testado' de 'testado e errado'");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v98 verde — fonte com rota própria, teste com limite declarado.");
