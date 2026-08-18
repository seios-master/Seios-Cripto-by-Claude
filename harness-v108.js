/* =====================================================================
   harness-v108.js — a régua suavizada vai para o LABORATÓRIO, não para o
   score
   =====================================================================
   Contra a v107 falha: `activeAddresses_suave ⚗` e `hashrate_suave ⚗` não
   existem lá, e a única evidência sobre a suavização é que ela reduz ruído.

   A v107 MEDIU e o número foi grande: na régua atual, os endereços ativos
   movem 51,9 pontos de score no dia MEDIANO (p95 = 144,2; máximo = 200,0,
   que é a saturação inteira), e 82% dos dias cruzam o corte de ±15. O hash
   rate é pior: p50 = 52,6 · p95 = 175,6 · 86% dos dias ≥ 15. A alternativa
   (média 7d contra média 7d) derruba o p95 para 17,3 e 25,8.

   E é exatamente por isso que esta build NÃO troca a régua.

   Reduzir ruído não é melhorar sinal. Suavizar até o indicador ficar quieto
   é trivial — a pergunta é se ele continua dizendo alguma coisa depois. Os
   endereços ativos separam 1,9pp na calibração; se a média de 7 dias cortar
   o ruído E a separação junto, a resposta certa não é média móvel.

   O precedente é o `funding_percentil ⚗` (v96): régua nova no laboratório,
   sem voto, medida lado a lado com a que vota. Só a v105 trocou, dez builds
   depois, com o número publicado.

   Uso:  node harness-v108.js index.html
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
let API;
try{
  API = new Function([
    declDe("clamp"), declDe("ultimoConhecidoAte"),
    declDe("hashrateScoreAtDate"), declDe("trendScoreAtDate"),
    declDe("mediaAte"), declDe("scoreSuavizadoAtDate"),
    "return { hashrateScoreAtDate, trendScoreAtDate, scoreSuavizadoAtDate };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }

function dia(i){ const d=new Date(Date.UTC(2024,0,1)); d.setUTCDate(d.getUTCDate()+i);
  return d.toISOString().slice(0,10); }
function serie(n, fn){ const o=[]; for(let i=0;i<n;i++) o.push({date:dia(i), value:fn(i)}); return o; }
function ruido(i){ const x=Math.sin(i*12.9898)*43758.5453; return x-Math.floor(x)-0.5; }
const RUIDOSA = serie(300, i => 1000*Math.pow(1.0005,i)*(1+0.25*ruido(i)));

console.log("\nBLOCO A — as duas réguas entram na MESMA tabela, comparáveis");

t("os dois pares laboratório existem e são registrados", ()=>{
  const limpo = semComentarios(HTML);
  ['registraIndicador("activeAddresses_suave ⚗"',
   'registraIndicador("hashrate_suave ⚗"'].forEach(function(s){
    if(limpo.indexOf(s) === -1) throw new Error("falta o registro: " + s);
  });
});

t("o laboratório usa a MESMA data e o MESMO retorno futuro do que vota", ()=>{
  /* se o par usar outra data ou outro `fwd`, a comparação da tabela deixa de
     significar alguma coisa — vira duas medições de coisas diferentes. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('registraIndicador("onchain.activeAddresses", addrScore, fwdInd)');
  if(i === -1) throw new Error("não achei o registro do que vota");
  const trecho = limpo.slice(i, i + 700);
  if(!/registraIndicador\("activeAddresses_suave ⚗", \w+, fwdInd\)/.test(trecho))
    throw new Error("o par suave não é registrado ao lado, com o mesmo fwdInd");
  if(!/registraIndicador\("hashrate_suave ⚗", \w+, fwdInd\)/.test(trecho))
    throw new Error("o par do hash rate não é registrado ao lado");
});

t("a suavizada é calculada com a MESMA escala do indicador que vota", ()=>{
  /* escala diferente muda o número de dias que cruzam ±15 e a comparação
     mediria a escala, não a régua. addr = 5 (clamp(pct*5)); hash = 6. */
  const limpo = semComentarios(HTML);
  if(!/scoreSuavizadoAtDate\(addrSeries, date, 5, 90, 7\)/.test(limpo))
    throw new Error("endereços ativos: escala ou janela divergente da que vota");
  if(!/scoreSuavizadoAtDate\(hashSeries, date, 6, 90, 7\)/.test(limpo))
    throw new Error("hash rate: escala ou janela divergente da que vota");
  const f = semComentarios(declDe("hashrateScoreAtDate"));
  if(!/clamp\(pct\*6, -100, 100\)/.test(f))
    throw new Error("a escala do hash rate que vota mudou — reconferir o par do laboratório");
});

console.log("\nBLOCO B — laboratório é laboratório: não vota, não pesa");

t("a guarda do ⚗ continua no vetor que decide", ()=>{
  const limpo = semComentarios(HTML);
  if(!/id\.indexOf\("⚗"\) === -1/.test(limpo))
    throw new Error("a guarda da v97 sumiu: o laboratório passaria a votar no backtest");
});

t("as suavizadas NÃO entram no composto do motor On-chain", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('registraIndicador("activeAddresses_suave ⚗"');
  /* sem esta linha o teste passa quando o registro NEM EXISTE: indexOf devolve
     −1, o slice pega um pedaço qualquer do arquivo e a asserção não encontra
     nada. Passe vazio, terceira vez nesta sessão. */
  if(i === -1) throw new Error("o registro do laboratório não existe — nada a verificar");
  const trecho = limpo.slice(i - 200, i + 500);
  if(/onchainVals\.push/.test(trecho))
    throw new Error("a régua de laboratório está entrando na média do motor");
});

t("o vivo continua com a régua ANTIGA — a v108 não troca nada", ()=>{
  const limpo = semComentarios(HTML);
  if(!/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/.test(limpo))
    throw new Error("o vivo trocou de régua numa build de laboratório");
  if(!/const addrScore = trendScoreAtDate\(addrSeries, date, 5, 90\)/.test(limpo))
    throw new Error("o backtest trocou de régua numa build de laboratório");
  if(!/const hrScore = hashrateScoreAtDate\(hashSeries, date\)/.test(limpo))
    throw new Error("o hash rate do backtest trocou de régua");
});

t("MODEL_VERSION continua m9 — nenhum score mudou de valor", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 9) throw new Error("modelo regrediu para m" + m[1]);
  if(Number(m[1]) > 9)
    throw new Error("m" + m[1] + ": laboratório não muda score, e bump zera as 777 à toa");
});

console.log("\nBLOCO C — as duas réguas de fato diferem (senão a tabela não decide nada)");

t("na série ruidosa as duas produzem leituras diferentes no mesmo dia", ()=>{
  const d = RUIDOSA[250].date;
  const a = API.trendScoreAtDate(RUIDOSA, d, 5, 90);
  const s = API.scoreSuavizadoAtDate(RUIDOSA, d, 5, 90, 7);
  if(a === null || s === null) throw new Error("uma das duas não produziu leitura");
  if(Math.abs(a - s) < 1)
    throw new Error("as réguas coincidem (" + a.toFixed(1) + " vs " + s.toFixed(1) +
                    "): a tabela compararia a régua com ela mesma");
});

t("e a suavizada continua tendo AMPLITUDE — não virou uma linha reta em zero", ()=>{
  /* o risco real desta build: suavizar até o indicador ficar mudo. Se a régua
     nova nunca cruza ±15, ela some da tabela como "amostra insuficiente" e a
     comparação não acontece — foi o que houve com o `funding` absoluto. */
  let cruza = 0, n = 0;
  for(let i = 120; i < RUIDOSA.length; i++){
    const s = API.scoreSuavizadoAtDate(RUIDOSA, RUIDOSA[i].date, 5, 90, 7);
    if(s === null) continue;
    n++; if(Math.abs(s) >= 15) cruza++;
  }
  if(!n) throw new Error("a régua suavizada não produziu leitura nenhuma");
  if(cruza / n < 0.10)
    throw new Error("a suavizada cruza ±15 em só " + (100*cruza/n).toFixed(0) +
                    "% dos dias — vira 'amostra insuficiente' e a comparação não acontece");
});

console.log("\nBLOCO D — a tela diz o que está sendo comparado, e o que ainda não sabe");

t("a legenda do laboratório nomeia os dois pares novos", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("é variável de");
  const trecho = limpo.slice(i, i + 2200);
  if(trecho.indexOf("activeAddresses_suave") === -1 || trecho.indexOf("hashrate_suave") === -1)
    throw new Error("a legenda não explica as linhas novas — viram sigla sem dono");
});

t("a tela declara a pergunta que a tabela responde, e a que ela NÃO responde", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("é variável de");
  const trecho = limpo.slice(i, i + 2200);
  if(!/separação|separa/.test(trecho))
    throw new Error("não diz que o critério de decisão é a separação, não o ruído");
  if(!/ruído menor não é sinal maior|reduzir ruído não/.test(trecho))
    throw new Error("a tela deixaria concluir que menos ruído já justifica a troca");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.107-/.test(m[1])) throw new Error("continua a v107: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v108 verde — a régua candidata é medida antes de decidir.");
