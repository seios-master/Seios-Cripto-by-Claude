/* =====================================================================
   harness-v106.js — o desequilíbrio do book vira sensor, e o estado
   salvo não o ressuscita
   =====================================================================
   Contra a v105 este arquivo falha nos três blocos. O que ele guarda:

   1. O indicador PARA DE VOTAR — medido ao vivo: +27,95 → +66,38 → −54,16
      → −78,33 em poucas horas, 120 pontos em 25 minutos, sozinho jogando o
      motor Técnico de +9,86 para −14,50. Soma quantidade dos 100 níveis sem
      converter em notional nem ponderar distância do meio, e mede um
      INSTANTE num sistema que lê de 8 em 8 horas.

   2. O TESTE QUE MAIS IMPORTA é o do BLOCO B, e ele não é sobre o book.
      `loadState()` funde o salvo por cima do padrão com
      `Object.assign({}, base.ind, parsed.ind)`. `excludeFromScore` é campo
      do indicador salvo — ou seja, trocar o padrão para `true` NÃO teria
      efeito nenhum no iPad do Jorge: o `false` gravado nas leituras da v105
      venceria o código novo. A tela diria "sensor, não pontua" e o
      indicador continuaria votando. Mentira silenciosa, sem erro, no
      exato defeito que esta build existe para remover.

      É a mesma família da v99.1 (acumulador que não zera) e da v102
      (estado velho decidindo sob régua nova): DADO SALVO NÃO DECIDE
      QUESTÃO DE MODELO.

   3. O ouro (v68) estava exposto ao mesmo buraco desde sempre.

   Uso:  node harness-v106.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v105 ou anterior?)");
  return bloco(i);
}
function constDe(nome){
  const i = HTML.indexOf("const " + nome + " = ");
  if(i === -1) throw new Error("sem constante " + nome);
  const abre = HTML.indexOf("{", i), pv = HTML.indexOf(";", i);
  if(abre === -1 || abre > pv) return HTML.slice(i, pv + 1);
  return bloco(i) + ";";
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}

const ctx = { S: null };
let API;
try{
  API = new Function("ctx", "with(ctx){" + [
    declDe("ind"), declDe("defaultState"), declDe("indicadoresVotantes"),
    declDe("forcarSensores"),
    "return { defaultState, indicadoresVotantes, forcarSensores };}"
  ].join("\n"))(ctx);
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,m){ if(Math.abs(a-b)>1e-9) throw new Error((m||"")+" "+a+" ≠ "+b); }

console.log("\nBLOCO A — o book imbalance para de votar, e continua sendo medido");

t("no estado padrão, bookImbalance nasce como SENSOR", ()=>{
  const S = API.defaultState();
  eq(S.motors.tecnico.indicators.bookImbalance.excludeFromScore, true,
     "excludeFromScore do book:");
});

t("indicadoresVotantes exclui o book e mantém os outros quatro", ()=>{
  ctx.S = API.defaultState();
  const v = API.indicadoresVotantes("tecnico");
  if(v.indexOf("bookImbalance") !== -1) throw new Error("o book continua votando");
  ["tendencia","momentum","rsi","mediaMovel"].forEach(function(k){
    if(v.indexOf(k) === -1) throw new Error("a demoção derrubou junto: " + k);
  });
  eq(v.length, 4, "votantes do Técnico:");
});

t("o motor Técnico NÃO foi compensado por baixo do pano", ()=>{
  /* o peso nominal do motor é decisão declarada; a demoção redistribui
     entre os 4 que sobram, e é só isso que pode mudar. */
  const S = API.defaultState();
  perto(S.motors.tecnico.weight, 0.04, "peso nominal do Técnico:");
  ctx.S = S;
  perto(S.motors.tecnico.weight / API.indicadoresVotantes("tecnico").length, 0.01,
        "peso por indicador votante:");
});

t("o valor continua sendo COLETADO e gravado — sensor não é indicador apagado", ()=>{
  const limpo = semComentarios(HTML);
  if(!/setAuto\("tecnico","bookImbalance"/.test(limpo))
    throw new Error("a coleta sumiu: sem série, nunca saberemos se ele informava algo");
  if(!/fetchBinanceBookImbalance\(\)/.test(limpo))
    throw new Error("a busca na Binance foi removida");
});

t("a tela diz que ele não pontua, e por quê", ()=>{
  const limpo = semComentarios(HTML);
  if(!/sensor, não pontua/.test(limpo.slice(limpo.indexOf("bookImbalance: ind("),
                                             limpo.indexOf("bookImbalance: ind(") + 200)))
    throw new Error("o rótulo não avisa que o indicador saiu do score");
  if(!/120 pontos em 25 ?min/.test(limpo))
    throw new Error("a medição que motivou a demoção não aparece na tela");
});

t("a microestrutura não tem OUTRO votante escondido", ()=>{
  /* asserção sobre o arquivo inteiro: se o teto de família de 0,05 continua
     valendo para alguém, esse alguém precisa ser nomeado aqui. */
  const limpo = semComentarios(HTML);
  const membros = [...limpo.matchAll(/"([\w.]+)":\s*\{[^}]*family:"microestrutura"/g)].map(m=>m[1]);
  membros.forEach(function(id){
    if(id !== "tecnico.bookImbalance")
      throw new Error("outro membro da microestrutura continua votando: " + id);
  });
});

console.log("\nBLOCO B — o estado salvo NÃO ressuscita o voto");

t("forcarSensores devolve o book ao estado de sensor, mesmo com `false` salvo", ()=>{
  const salvo = API.defaultState();
  salvo.motors.tecnico.indicators.bookImbalance.excludeFromScore = false; // v105 no disco
  salvo.motors.tecnico.indicators.bookImbalance.value = -78.33;
  API.forcarSensores(salvo);
  eq(salvo.motors.tecnico.indicators.bookImbalance.excludeFromScore, true,
     "depois do reforço:");
  eq(salvo.motors.tecnico.indicators.bookImbalance.value, -78.33,
     "o VALOR salvo não pode ser apagado junto:");
});

t("o ouro estava exposto ao mesmo buraco desde a v68 — e agora não está", ()=>{
  const salvo = API.defaultState();
  salvo.motors.ativosGlobais.indicators.ouro.excludeFromScore = false;
  API.forcarSensores(salvo);
  eq(salvo.motors.ativosGlobais.indicators.ouro.excludeFromScore, true, "ouro:");
});

t("quem VOTA continua votando — o reforço não é um interruptor geral", ()=>{
  const salvo = API.defaultState();
  API.forcarSensores(salvo);
  eq(salvo.motors.tecnico.indicators.rsi.excludeFromScore, false, "rsi:");
  eq(salvo.motors.macro.indicators.liquidez.excludeFromScore, false, "liquidez:");
});

t("indicador que só existe no salvo não estoura o reforço", ()=>{
  const salvo = API.defaultState();
  salvo.motors.tecnico.indicators.inventado = { excludeFromScore: false };
  salvo.motors.inventado = { indicators: { x: { excludeFromScore: false } } };
  API.forcarSensores(salvo);   // não pode levantar
});

/* ===================================================================
   O TESTE QUE FALTAVA NA v106 — e por isso a v106 foi ao ar quebrada.
   A v106 chamava `forcarSensores(merged, base)` e eu testei passando DOIS
   `defaultState()` independentes. No código real eles são O MESMO OBJETO:
   `loadState` faz `merged.motors = base.motors`, e o laço de merge escreve
   dentro dos dois ao mesmo tempo. Quando o reforço rodava, o `base` já
   estava contaminado com o `false` salvo — ele copiava `false` sobre
   `false`, executava, e não fazia nada.
   MEDIDO ao vivo na v106: Técnico marcou −6,90, que é a média dos CINCO
   (13,61 − 48,09)/5. Sem o book seriam +3,40. O ouro escapou por acidente:
   o valor salvo dele já era `true`.
   Este teste reproduz o loadState inteiro, com o aliasing. Testar a função
   sozinha não bastava — foi testar a defesa sem o ataque. */
t("O TESTE QUE FALTAVA: o reforço funciona com o `base` JÁ CONTAMINADO", ()=>{
  const parsedNoDisco = JSON.parse(JSON.stringify(API.defaultState()));
  parsedNoDisco.motors.tecnico.indicators.bookImbalance.excludeFromScore = false;
  // réplica fiel do miolo do loadState, aliasing incluído
  const base = API.defaultState();
  const merged = Object.assign({}, base, parsedNoDisco);
  merged.motors = base.motors;                        // <<< a mesma referência
  Object.keys(base.motors).forEach(function(mk){
    if(parsedNoDisco.motors[mk] && parsedNoDisco.motors[mk].indicators){
      Object.keys(base.motors[mk].indicators).forEach(function(ik){
        if(parsedNoDisco.motors[mk].indicators[ik]){
          merged.motors[mk].indicators[ik] = Object.assign(
            {}, base.motors[mk].indicators[ik], parsedNoDisco.motors[mk].indicators[ik]);
        }
      });
    }
  });
  if(base.motors.tecnico.indicators.bookImbalance.excludeFromScore !== false)
    throw new Error("o teste não reproduz o aliasing; o loadState mudou de forma");
  API.forcarSensores(merged);
  eq(merged.motors.tecnico.indicators.bookImbalance.excludeFromScore, true,
     "depois do reforço, com o base contaminado:");
});

t("o reforço não confia em quem chama — ele deriva o padrão de dentro", ()=>{
  const f = semComentarios(declDe("forcarSensores"));
  if(!/defaultState\(\)/.test(f))
    throw new Error("continua recebendo o padrão de fora, e fora ele pode já estar contaminado");
});

t("loadState CHAMA o reforço, e DEPOIS do merge", ()=>{
  const f = semComentarios(declDe("loadState"));
  if(!/forcarSensores\(merged\)/.test(f))
    throw new Error("o merge continua deixando o dado salvo decidir questão de modelo");
  const iMerge = f.indexOf("Object.assign(");
  const iForca = f.indexOf("forcarSensores(merged)");
  if(!(iMerge > -1 && iForca > iMerge))
    throw new Error("o reforço acontece antes do merge — o Object.assign desfaz ele em seguida");
});

t("a importação de backup passa pelo mesmo caminho", ()=>{
  /* o import grava no localStorage e relê com loadState(); se algum dia ele
     escrever direto em S, o reforço deixa de valer e este teste quebra. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))");
  if(i === -1) throw new Error("não achei a gravação do backup importado");
  if(!/S = loadState\(\)/.test(limpo.slice(i, i + 200)))
    throw new Error("o backup importado entra no estado sem passar pelo reforço");
});

console.log("\nBLOCO C — a mudança está declarada");

/* v106.1 — a leitura coletada sob m8 foi produzida com o book AINDA VOTANDO:
   o rótulo dizia sensor e o score somava cinco. Ela não é m8, é m7 com nome
   errado. m9 separa a régua declarada da régua que de fato rodou. Custo real:
   1 leitura e 0 janelas independentes. */
t("MODEL_VERSION foi para m9 — o m8 rodou com o book votando", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(!m) throw new Error("MODEL_VERSION fora do formato mN-data");
  if(Number(m[1]) < 9)
    throw new Error("continua m" + m[1] + ": o score muda de valor sem bump, e a série mistura réguas");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.105-/.test(m[1])) throw new Error("continua a v105: " + m[1]);
  if(/^2026-08-17\.106-/.test(m[1])) throw new Error("continua a v106 quebrada: " + m[1]);
});

t("a nota da leitura diz que o número não entra no score", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('setAuto("tecnico","bookImbalance"');
  const trecho = limpo.slice(i, i + 400);
  if(!/não pontua/.test(trecho))
    throw new Error("a leitura aparece na tela sem dizer que é sensor");
});

t("a tela NÃO promete que a demoção melhora a previsão", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("120 pontos em 25");
  const trecho = limpo.slice(Math.max(0, i - 400), i + 400);
  if(!/não sabemos|pode ter sinal|a série decide/i.test(trecho))
    throw new Error("a demoção aparece como conclusão sobre o indicador, e não é: " +
                    "ele saiu por ser instantâneo demais para o relógio do sistema, não por ser inútil");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v106 verde — a microestrutura registra, e não vota.");
