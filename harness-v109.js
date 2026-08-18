/* =====================================================================
   harness-v109.js — a coluna SEPARAÇÃO ganha barra de erro
   =====================================================================
   Contra a v108 falha: `estatisticaSeparacao` não existe lá, e a tabela de
   calibração exibe 20+ diferenças de pontos percentuais SEM NENHUMA medida
   de incerteza — e nós viemos decidindo com base nelas a sessão inteira.

   O que forçou esta build: a v108 mediu as duas réguas candidatas e elas
   responderam em direções OPOSTAS. `activeAddresses_suave` dobrou a
   separação (1,9 → 3,8pp); `hashrate_suave` INVERTEU (1,2pp coerente →
   1,6pp invertido). Mesma fonte, mesma transformação, mesma janela.
   Sem barra de erro não há como saber se isso é sinal ou sorteio — e
   escolher só o resultado que agrada seria escolher o vencedor depois de
   ver o placar.

   O precedente existe e é do próprio projeto: o ouro virou sensor na v68
   porque t ≈ 0,43, abaixo da significância. Aquele número existia. Depois
   a tabela cresceu e a incerteza sumiu dela.

   DUAS estatísticas, e a diferença entre elas importa:
     · t ingênuo   — trata cada dia como observação independente
     · t efetivo   — corrige pela sobreposição das janelas de 30 dias
   Retornos futuros de 30 dias medidos em dias consecutivos compartilham 29
   dias de caminho. O t ingênuo infla por construção; o efetivo é o que
   deve mandar.

   Uso:  node harness-v109.js index.html
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
  if(i === -1) throw new Error("sem função " + nome + " (é a v108 ou anterior?)");
  return bloco(i);
}
function semComentarios(t){
  return String(t).replace(/\/\*[\s\S]*?\*\//g," ").replace(/(^|[^:])\/\/.*$/gm,"$1");
}
let API;
try{
  API = new Function([
    declDe("estatisticaSeparacao"),
    "return { estatisticaSeparacao };"
  ].join("\n"))();
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+b+", veio "+a); }
function perto(a,b,tol,m){ if(Math.abs(a-b)>(tol||1e-9)) throw new Error((m||"")+" "+a+" ≠ "+b); }

/* amostras determinísticas */
function amostra(n, media, desvio){
  const out = [];
  for(let i=0;i<n;i++){
    const x = Math.sin(i*7.13)*0.5 + Math.sin(i*2.71)*0.5;  // ~simétrico, det.
    out.push(media + desvio*x);
  }
  return out;
}

console.log("\nBLOCO A — a estatística existe e se comporta");

t("distribuições IDÊNTICAS não separam: sep 0 e t 0", ()=>{
  const a = amostra(120, -4, 8), b = amostra(120, -4, 8);
  const e = API.estatisticaSeparacao(a, b, 30);
  perto(e.sep, 0, 1e-9, "separação:");
  perto(e.t, 0, 1e-9, "t:");
});

t("separação grande com AMOSTRA GRANDE produz t grande", ()=>{
  const bull = amostra(300, +6, 8), bear = amostra(300, -6, 8);
  const e = API.estatisticaSeparacao(bull, bear, 30);
  if(!(e.sep > 10)) throw new Error("separação não reproduzida: " + e.sep);
  if(!(Math.abs(e.t) > 4)) throw new Error("t ingênuo pequeno demais: " + e.t);
});

t("A MESMA separação com amostra PEQUENA não sustenta conclusão", ()=>{
  /* é o caso do `activeAddresses_suave`: 22 dias no lado bullish. */
  const bull = amostra(10, +6, 8), bear = amostra(10, -6, 8);
  const e = API.estatisticaSeparacao(bull, bear, 30);
  if(!(e.sep > 10)) throw new Error("a separação deveria ser a mesma: " + e.sep);
  /* 10 dias brutos sobre horizonte de 30 = ~0,33 observação efetiva. Não é
     caso de t pequeno: é caso de NÃO HAVER amostra para veredito. */
  if(e.suficiente !== false)
    throw new Error("10 dias sobrepostos foram aceitos como amostra suficiente");
});

t("O TESTE QUE DÓI: a sobreposição das janelas DERRUBA o t", ()=>{
  /* 30 dias consecutivos de retorno futuro de 30d compartilham 29 dias de
     caminho. Tratar cada dia como independente infla o t por ~√30. */
  const bull = amostra(300, +3, 8), bear = amostra(300, -3, 8);
  const e = API.estatisticaSeparacao(bull, bear, 30);
  if(!(Math.abs(e.t) > Math.abs(e.tEfetivo)))
    throw new Error("o t efetivo não é mais conservador que o ingênuo");
  const razao = Math.abs(e.t) / Math.abs(e.tEfetivo);
  if(razao < 4 || razao > 7)
    throw new Error("a correção não é da ordem de √30 (≈5,5): razão " + razao.toFixed(2));
});

t("horizonte 1 (sem sobreposição) deixa os dois t iguais", ()=>{
  const bull = amostra(100, +5, 8), bear = amostra(100, -5, 8);
  const e = API.estatisticaSeparacao(bull, bear, 1);
  perto(e.t, e.tEfetivo, 1e-9, "sem sobreposição os dois t coincidem:");
});

t("amostra insuficiente devolve null em vez de um número frágil", ()=>{
  eq(API.estatisticaSeparacao(amostra(7,1,1), amostra(50,1,1), 30), null, "7 dias de um lado:");
  eq(API.estatisticaSeparacao([], [], 30), null, "vazio:");
  eq(API.estatisticaSeparacao(null, null, 30), null, "nulo:");
  /* sem esta linha o teste passa contra um stub que devolve null SEMPRE —
     recusar tudo não é o mesmo que recusar o insuficiente */
  if(API.estatisticaSeparacao(amostra(50,1,1), amostra(50,-1,1), 30) === null)
    throw new Error("50 dias de cada lado deveriam produzir estatística");
});

t("variância zero não vira divisão por zero nem t infinito", ()=>{
  const e = API.estatisticaSeparacao(new Array(50).fill(5), new Array(50).fill(-5), 30);
  if(e === null) throw new Error("recusou a amostra inteira — o teste não separa nada");
  if(!Number.isFinite(e.t)) throw new Error("t infinito: " + e.t);
  if(!Number.isFinite(e.tEfetivo)) throw new Error("t efetivo infinito: " + e.tEfetivo);
});

console.log("\nBLOCO B — a tabela passa a mostrar a incerteza, e a usa para rotular");

t("a tabela ganhou a coluna de significância", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("<th>Separação</th>");
  if(i === -1) throw new Error("não achei o cabeçalho da tabela de calibração");
  const trecho = limpo.slice(i, i + 400);
  if(!/Significância|t \(sobreposição/.test(trecho))
    throw new Error("a coluna de incerteza não existe — a tabela continua sem barra de erro");
});

t("o rótulo REBAIXA quem não passa no t efetivo", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('leitura = "✓ separa "');
  if(i === -1) throw new Error("não achei o rótulo de separação");
  const trecho = limpo.slice(i - 900, i + 900);
  if(!/tEfetivo/.test(trecho))
    throw new Error("o rótulo continua decidido só pela diferença em pp, sem olhar o t");
  if(!/não distinguível de zero|sem significância/.test(trecho))
    throw new Error("não existe rótulo para o caso de separação sem significância");
});

t("a estatística usa o MESMO horizonte do retorno medido", ()=>{
  const limpo = semComentarios(HTML);
  if(!/estatisticaSeparacao\(b\.bull, b\.bear, forwardDays\)/.test(limpo))
    throw new Error("a correção de sobreposição não usa o horizonte real do teste");
});

console.log("\nBLOCO C — é medição: nada muda de valor");

  /* v110 — DE FATO DATADO PARA INVARIANTE. Este teste dizia "continua m9", que
     é um fato sobre o instante em que esta build nasceu, não uma invariante:
     expirou no primeiro bump legítimo (m10, v110). Mesmo erro que a v101
     corrigiu nos harnesses v95/v96 e a v105 nos v102/v103/v104 — e que eu
     repeti três vezes no mesmo dia, depois de ler os comentários que o
     descreviam. O que vale para sempre é que o modelo não anda para trás; o
     que esta build garantia — não ter mexido na fórmula que vota — já é
     afirmado pelo teste vizinho. */
t("MODEL_VERSION nunca regride — a v109 nasceu no m9", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  if(Number(m[1]) < 9) throw new Error("modelo regrediu para m" + m[1]);
});

t("as fórmulas que votam continuam intactas", ()=>{
  const limpo = semComentarios(HTML);
  if(!/setAuto\("onchain","activeAddresses", clamp\(pct\*5, -100, 100\)/.test(limpo))
    throw new Error("o vivo mudou de régua numa build de medição");
  if(!/const addrScore = trendScoreAtDate\(addrSeries, date, 5, 90\)/.test(limpo))
    throw new Error("o backtest mudou de régua numa build de medição");
});

t("a função de estatística não escreve estado nenhum", ()=>{
  const f = semComentarios(declDe("estatisticaSeparacao"));
  if(/setAuto|registraIndicador|S\.|valoresDia/.test(f))
    throw new Error("a estatística está tocando no estado");
});

console.log("\nBLOCO D — a tela explica o que o número significa, e o que ele não resolve");

t("a tela declara por que o t ingênuo infla", ()=>{
  const limpo = semComentarios(HTML);
  if(!/sobrepostas|sobreposição/.test(limpo))
    throw new Error("não explica que janelas de 30d em dias consecutivos se sobrepõem");
  if(!/√30|raiz de 30|30 dias de caminho|29 dias/.test(limpo))
    throw new Error("não diz de onde vem a correção");
});

t("a tela cita o precedente do ouro — t 0,43 — como a régua já usada", ()=>{
  const limpo = semComentarios(HTML);
  if(limpo.indexOf("0,43") === -1 && limpo.indexOf("0.43") === -1)
    throw new Error("a decisão do ouro (v68) some da explicação; era o único t que o projeto já tinha");
});

t("a tela avisa que isto pode invalidar linhas já citadas", ()=>{
  /* ancorado no bloco NOVO: a busca solta casava com o aviso da v97, que fala
     de outra coisa. Passe vazio por texto vizinho é o pior dos três tipos —
     ele parece cobertura de uma afirmação que ninguém escreveu. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf("Significância");
  if(i === -1) throw new Error("não achei o bloco da significância");
  const trecho = limpo.slice(i, i + 3000);
  if(!/já citad|linhas que já usamos|evidência anterior/i.test(trecho))
    throw new Error("o bloco novo não admite que a coluna pode derrubar evidência antiga");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.108-/.test(m[1])) throw new Error("continua a v108: " + m[1]);
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v109 verde — a separação passa a vir com barra de erro.");
