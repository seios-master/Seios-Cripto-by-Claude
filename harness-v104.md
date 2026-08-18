/* =====================================================================
   harness-v104.js — o normal não é zero
   =====================================================================
   Contra a v103 falha inteiro: `M2_LONGO` não existe lá, e a distribuição
   do M2 nunca foi medida. O que este banco prova não é que a régua mudou —
   ela NÃO mudou de propósito. Prova que a MEDIÇÃO existe, que ela não
   escreve estado, e que o defeito que ela mede é o que eu disse que era.

   Uso:  node harness-v104.js index.html
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
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome + " (é a v103 ou anterior?)");
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
    constDe("M2_LONGO"), declDe("clamp"), declDe("escalaSuave"),
    declDe("percentilExpandido"), declDe("scoreDoPercentil"),
    constDe("NORMALIZACAO"), declDe("norm"),
    "return { M2_LONGO, norm, escalaSuave, scoreDoPercentil, percentilExpandido };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,tol,m){ if(Math.abs(a-b)>(tol||0.05)) throw new Error((m||"")+" "+a+" ≠ "+b); }

console.log("\nBLOCO A — o defeito que esta build mediu, e a v105 removeu");

/* ATENÇÃO — ESTES TESTES FORAM REESCRITOS NA v105, E O MOTIVO IMPORTA.
   O bloco A original afirmava propriedades da régua ANTIGA: centro em zero,
   bearish só abaixo de −1,01%, o normal pontuando acima de 70. Eram afirmações
   verdadeiras sobre um defeito — e o propósito da v104 era medi-lo, não
   corrigi-lo. A v105 corrigiu. Manter as asserções antigas faria a bateria
   exigir de volta o defeito; apagá-las deixaria a correção sem guarda.
   Então elas viram o contrário: afirmam que a régua antiga NÃO está mais no
   caminho que decide, e guardam os números medidos como referência histórica. */

t("a régua da liquidez NÃO tem mais centro em zero — ela normaliza um rank", ()=>{
  /* entrada agora é percentil (0..1): rank 0,5 é o normal e dá score 0 */
  if(API.norm("macro.liquidez", 0.5) !== 0)
    throw new Error("rank mediano deveria dar 0, deu " + API.norm("macro.liquidez", 0.5));
  /* e o zero absoluto de YoY, que antes dava 0, agora é rank 0 = extremo baixo */
  if(API.norm("macro.liquidez", 0) !== -100)
    throw new Error("rank 0 deveria dar −100, deu " + API.norm("macro.liquidez", 0));
});

t("o sentido é DIRETO: crescer acima do próprio normal é bullish", ()=>{
  /* o erro que este teste impede é silencioso e caro: `scoreDoPercentil`
     nasceu contrária, para o funding. Reaproveitá-la sem sentido declarado
     inverteria o indicador de maior peso do sistema sem levantar erro. */
  if(!(API.norm("macro.liquidez", 0.9) > 0)) throw new Error("percentil alto deveria ser bullish");
  if(!(API.norm("macro.liquidez", 0.1) < 0)) throw new Error("percentil baixo deveria ser bearish");
  /* e a versão contrária continua contrária para quem depende dela */
  if(!(API.scoreDoPercentil(0.9) < 0)) throw new Error("o padrão contrário mudou — o funding inverteu");
});

t("a régua ANTIGA não sobrou em lugar nenhum que decide", ()=>{
  /* medido e registrado quando ela ainda rodava: M2 +5,5% dava +67,8;
     o normal histórico (+6,3%) dava +73,7; para marcar bearish o M2 tinha
     que encolher mais de 1,01% ao ano, o que ocorreu em 15 de 426 meses. */
  const limpo = semComentarios(HTML);
  if(/"macro\.liquidez":\s*yoy\s*=>\s*escalaSuave/.test(limpo))
    throw new Error("a porta canônica voltou a receber YoY em vez de rank");
  perto(API.escalaSuave(5.5, 6.67), 67.76, 0.5, "referência histórica da régua antiga:");
});

t("os OUTROS quatro do Macro continuam intactos", ()=>{
  /* a correção não pode vazar para quem não tinha o defeito: juros, inflação
     e dxy são DELTAS; a curva é nível, mas o zero dela é a inversão. */
  ["macro.juros","macro.inflacao","macro.dxy","macro.curva"].forEach(function(id){
    eq(API.norm(id, 0), 0, id + " em repouso:");
  });
});

console.log("\nBLOCO B — a medição existe, e é só medição");

t("M2_LONGO nasce vazio e declara o próprio erro", ()=>{
  eq(Array.isArray(API.M2_LONGO.yoy), true, "yoy é lista:");
  eq(API.M2_LONGO.yoy.length, 0, "nasce vazio:");
  eq(API.M2_LONGO.erro, null, "erro:");
});

t("a série longa é zerada a cada rodada — não acumula entre backtests", ()=>{
  /* a regra da v99.1: acumulador que não zera vira memória de erro corrigido */
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(!/M2_LONGO\.yoy = \[\]; M2_LONGO\.erro = null/.test(f))
    throw new Error("a série longa sobrevive à rodada seguinte");
});

t("a busca longa NÃO alimenta maps — não toca em score nenhum", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  const i = f.indexOf('fetchFredSeriesRange("M2SL", "1990-01-01")');
  if(i === -1) throw new Error("não busca a série longa");
  /* a janela tem que parar ANTES do bloco seguinte, que é o que alimenta
     `maps.liquidez` de verdade. 700 caracteres invadiam o vizinho e o teste
     acusava o código por um `maps.` que não era dele. */
  const fim = f.indexOf("fetchFredSeriesRange(\"M2SL\", startMonthly)", i);
  const trecho = f.slice(i, fim > i ? fim : i + 700);
  if(/maps\./.test(trecho))
    throw new Error("a leitura de 35 anos está escrevendo em maps — vira score");
  if(/setAuto|norm\(/.test(trecho))
    throw new Error("a leitura está pontuando");
});

t("a busca longa não derruba o backtest se falhar", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  const i = f.indexOf('fetchFredSeriesRange("M2SL", "1990-01-01")');
  const trecho = f.slice(i - 200, i + 900);
  if(!/catch\(e\)\{ M2_LONGO\.erro/.test(trecho))
    throw new Error("sem catch próprio: 35 anos de M2 fora do ar matariam a calibração inteira");
});

/* v105 — este teste exigia que o backtest continuasse na janela CURTA, porque
   na v104 mudar a janela seria mudar o histórico em silêncio. A v105 mudou de
   propósito e declarado: o percentil precisa do prior longo, e 18 leituras não
   fazem percentil. A asserção inverte junto. */
t("o backtest pontua a liquidez pela série LONGA, não pela janela de 900 dias", ()=>{
  const f = semComentarios(declDe("fetchMacroHistoryMaps"));
  if(/fetchFredSeriesRange\("M2SL", startMonthly\)/.test(f))
    throw new Error("a janela curta voltou a alimentar maps.liquidez");
  if(!/const serie = M2_LONGO\.yoy/.test(f))
    throw new Error("o backtest não usa a série longa");
});

console.log("\nBLOCO C — o que a tela diz, e o que ela se recusa a dizer");

t("a tabela exige amostra antes de aparecer", ()=>{
  const limpo = semComentarios(HTML);
  if(!/if\(!S2 \|\| S2\.length < 60\) return ""/.test(limpo))
    throw new Error("a distribuição apareceria com meia dúzia de meses");
});

t("a tela conta cada lado nas DUAS réguas", ()=>{
  const limpo = semComentarios(HTML);
  ["Distribuição do M2", "Régua antiga:", "Régua nova:"].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("falta na tela: " + s);
  });
});

t("a tela declara o que a troca NÃO afirma", ()=>{
  const limpo = semComentarios(HTML);
  if(!/não<\/strong> afirma que o M2 assim prevê melhor|não afirma que o M2 assim prevê melhor/.test(limpo))
    throw new Error("a troca apareceria como promessa de previsão");
  if(!/a resposta pode muito bem\s*\n?\s*ser não|pode muito bem/.test(limpo))
    throw new Error("não admite que o resultado pode ser negativo");
});

/* v105 — a v104 nomeava três alternativas sem escolher. A escolha foi feita
   (percentil expandido) e as duas não escolhidas continuam nomeadas na tela,
   como alternativas não testadas. É isso que este teste passa a guardar. */
t("as alternativas NÃO escolhidas continuam nomeadas na tela", ()=>{
  const limpo = semComentarios(HTML);
  ["mediana", "z-score por regime", "não testadas"].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("alternativa esquecida: " + s);
  });
});

console.log("\nBLOCO D — nada que decide mudou");

/* v105 — de fato datado para invariante, como nos harnesses v102 e v103. */
t("MODEL_VERSION nunca regride — a v104 nasceu no m6", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 6) throw new Error("modelo regrediu para m" + m[1]);
});

/* v105 — a v104 exigia que a fórmula NÃO mudasse, porque era build de
   medição. Cumpriu-se: a v104 foi ao ar com a régua antiga intacta e a
   medição na tela. A v105 trocou a régua com o número já publicado, que era
   exatamente a sequência combinada. O que sobra como invariante é a ORDEM:
   a medição está no arquivo antes de a régua mudar, e continua nele. */
t("a medição que justificou a troca continua na tela", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf("Distribuição do M2") === -1)
    throw new Error("a régua mudou e a evidência que a justificou sumiu");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.103-/.test(m[1])) throw new Error("continua a v103: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v104 verde — o defeito medido, e a régua trocada com a evidência na tela.");
