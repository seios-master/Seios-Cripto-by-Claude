/* =====================================================================
   harness-v137.js — o herói para de ser a tela inteira
   =====================================================================
   Só apresentação. MODEL_VERSION continua m12, score intocado.

   O PROBLEMA, e ele custou TRÊS builds antes de ser medido: o Jorge reclamou
   três vezes que a página estava grande, e nas três eu dobrei painéis que já
   nasciam `hidden`. A tela não encolheu um pixel porque o que ocupava a tela
   estava FORA do `#app`.

   A MEDIÇÃO que faltou, a 390px de largura:
      herói ................ ~666px   (uma tela inteira, sozinho)
      cabeçalho ............ ~440px
      painel das dobras .... ~380px
      faixa ao vivo ......... ~60px

   E dentro do herói, o custo não era o veredito de 48px:
      lista de itens do regime  ~128px  — CÓPIA LITERAL da dobra Ciclo
      frase do cenário          ~150px
      três linhas de média       ~90px

   A CORREÇÃO: os itens do regime somem do herói (não se perde nada — estão
   inteiros na dobra Ciclo). A frase e as médias viram a SÉTIMA linha,
   `Contexto`. O herói fica com pergunta, veredito, ação e preço.

   A EXCEÇÃO que os testes protegem: quando não há leitura, o motivo CONTINUA
   no herói. Esconder o porquê atrás de um toque seria o mesmo erro que o
   veredito travado existe para não cometer.

   Uso:  node harness-v137.js index.html
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

const HERO = semComentarios(declDe("renderHero"));
/* o herói tem DUAS escritas de HTML: `wrap.innerHTML` (o cartão) e os
   containers das dobras. Vários testes abaixo só valem para o cartão. */
const CARTAO = (function(){
  const i = HERO.indexOf("wrap.innerHTML");
  const f = HERO.indexOf("`;", i);
  if(i === -1 || f === -1) throw new Error("não achei wrap.innerHTML");
  return HERO.slice(i, f);
})();

const guardado = {};
const localStorage = {
  getItem:function(k){ return Object.prototype.hasOwnProperty.call(guardado,k)?guardado[k]:null; },
  setItem:function(k,v){ guardado[k]=String(v); },
  removeItem:function(k){ delete guardado[k]; }
};
let API;
try{
  API = new Function("localStorage", "esc", [
    declDe("dobra"), "return { dobra };"
  ].join("\n"))(localStorage, function(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]; });
  });
}catch(e){ console.error("FALHA AO MONTAR:", e.message); process.exit(1); }

let ok=0,bad=0; const falhas=[];
function t(n,f){ try{ f(); ok++; console.log("  ✓ "+n); }
  catch(e){ bad++; falhas.push(n+": "+e.message); console.log("  ✗ "+n+"  — "+e.message); } }
function eq(a,b,m){ if(a!==b) throw new Error((m||"")+" esperado "+JSON.stringify(b)+", veio "+JSON.stringify(a)); }

console.log("\nBLOCO A — o herói perdeu o que estava DUPLICADO");

t("a lista de itens do regime saiu do cartão", ()=>{
  /* ESTE é o teste que falha contra a v136. Os cinco itens estavam desenhados
     duas vezes na MESMA tela — aqui e no corpo da dobra Ciclo, com as mesmas
     setas e as mesmas cores. ~128px de altura por nada. */
  if(/REG\.itens\.map/.test(CARTAO))
    throw new Error("o cartão ainda desenha os itens — continua duplicando a dobra Ciclo");
});

t("mas os itens CONTINUAM existindo, na dobra Ciclo", ()=>{
  /* dobrar não pode virar apagar: se a v137 tivesse removido os dois, a
     informação teria sumido do sistema e este teste passaria por engano. */
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('dobra("regime", "Ciclo"');
  if(i === -1) throw new Error("a dobra Ciclo sumiu");
  const trecho = limpo.slice(i, i + 3000);
  if(!/R\.itens\.map/.test(trecho))
    throw new Error("os itens não estão na dobra Ciclo — a informação foi APAGADA, não movida");
});

t("as três linhas de média saíram do cartão", ()=>{
  if(/\$\{linhasMA\}/.test(CARTAO))
    throw new Error("o cartão ainda desenha as médias");
});

t("a frase do cenário só fica no herói QUANDO NÃO HÁ LEITURA", ()=>{
  /* a exceção deliberada: "Sem leitura" sem o motivo à vista seria esconder
     o porquê atrás de um toque. */
  if(!/semLeitura \?/.test(CARTAO))
    throw new Error("o cartão não distingue mais o caso sem leitura");
  if(/esc\(fraseDoEstado\(ms, hs\)\)/.test(CARTAO))
    throw new Error("a frase do cenário continua no cartão em uso normal");
  if(!/motivoTrava/.test(CARTAO))
    throw new Error("o motivo da trava sumiu do herói");
});

t("o que responde \"e aí?\" continua no cartão", ()=>{
  [["hero-verdict","veredito"],["hero-action","ação"],["hero-price","preço"],
   ["hero-eyebrow","a pergunta"]].forEach(function(par){
    if(CARTAO.indexOf(par[0]) === -1) throw new Error("sumiu do herói: " + par[1]);
  });
});

t("o SCORE continua visível sem abrir nada", ()=>{
  /* é o número que está sendo acumulado nas 777. Se ele só existisse dentro
     de uma dobra, a tela deixaria de mostrar o que o projeto está medindo. */
  if(!/hero-meta/.test(CARTAO)) throw new Error("sem a linha hero-meta");
  if(!/ms\.score/.test(CARTAO)) throw new Error("o score sumiu do herói");
  if(!/cobertura/.test(CARTAO)) throw new Error("a cobertura sumiu do herói");
  if(HTML.indexOf(".hero-meta{") === -1) throw new Error("a classe .hero-meta não tem CSS");
});

console.log("\nBLOCO B — Contexto é a SÉTIMA linha");

t("o container existe no HTML, dentro do painel das dobras", ()=>{
  const i = HTML.indexOf('id="contextoBar"');
  if(i === -1) throw new Error("sem #contextoBar");
  const j = HTML.indexOf('id="painelLeituras"');
  const k = HTML.indexOf("</section>", j);
  if(!(i > j && i < k)) throw new Error("#contextoBar está fora do painel das dobras");
});

t("Contexto é uma dobra e NASCE FECHADA", ()=>{
  const limpo = semComentarios(HTML);
  const i = limpo.indexOf('dobra("contexto", "Contexto"');
  if(i === -1) throw new Error("não existe a dobra contexto");
  const trecho = limpo.slice(i, i + 2500);
  if(!/,\s*false\)/.test(trecho))
    throw new Error("Contexto nasce aberta — a tela volta a nascer longa");
});

t("a frase e as médias estão DENTRO do corpo do Contexto", ()=>{
  const i = HERO.indexOf('dobra("contexto"');
  if(i === -1) throw new Error("sem a dobra contexto no renderHero");
  const corpo = HERO.slice(i, i + 2500);
  if(!/fraseDoEstado\(ms, hs\)/.test(corpo)) throw new Error("a frase não foi movida — foi apagada");
  if(!/linhasMA/.test(corpo)) throw new Error("as médias não foram movidas — foram apagadas");
});

t("FECHADA, a linha carrega a resposta — não um rótulo mudo", ()=>{
  /* a regra da dobra, da v132: "Contexto ▸" obrigaria a abrir para saber de
     que se trata. O resumo tem que dizer acima de quantas médias o preço está. */
  const i = HERO.indexOf("const resumoCtx");
  if(i === -1) throw new Error("sem resumo próprio");
  const r = HERO.slice(i, HERO.indexOf('dobra("contexto"'));
  if(!/acima de/.test(r)) throw new Error("o resumo não diz a relação com as médias");
  if(!/MA200/.test(r)) throw new Error("o resumo não traz a distância da MA200");
  if(!/sem médias semanais/.test(r)) throw new Error("sem caminho para o caso sem dado");
});

t("o resumo NÃO inventa leitura quando não há média nenhuma", ()=>{
  /* Number(null) é zero, não NaN — erro que já cometi duas vezes. Aqui, uma
     média ausente não pode virar "acima de 0 de 0 médias" em vermelho. */
  const i = HERO.indexOf("const comValor");
  const r = HERO.slice(i, i + 900);
  if(!/!== null && v !== undefined/.test(r))
    throw new Error("a filtragem não separa ausente de zero");
  if(!/!comValor\.length \? COLOR\.faint/.test(r))
    throw new Error("lista vazia não cai no caminho neutro");
});

t("SÃO SETE LINHAS — uma por leitura independente", ()=>{
  const limpo = semComentarios(HTML);
  ["regime","fluxo","liquidacoes","cadencia","prazos","contexto","motores"].forEach(function(id){
    if(limpo.indexOf('dobra("' + id + '"') === -1)
      throw new Error("falta a linha: " + id);
  });
});

t("a chave da nova dobra é lembrada como as outras", ()=>{
  eq(API.dobra("contexto","Contexto","x","y",false).indexOf(" open") !== -1, false, "padrão fechado:");
  localStorage.setItem("seios_dobra_contexto", "1");
  eq(API.dobra("contexto","Contexto","x","y",false).indexOf(" open") !== -1, true, "aberto à mão:");
});

console.log("\nBLOCO C — nada que decide mudou");

t("MODEL_VERSION continua m12", ()=>{
  const m = /const MODEL_VERSION = "m(\d+)-/.exec(HTML);
  eq(Number(m[1]), 12, "modelo:");
});

t("o BUILD mudou", ()=>{
  const m = /const BUILD_VERSION = "([^"]+)"/.exec(HTML);
  if(/\.136/.test(m[1])) throw new Error("continua a v136: " + m[1]);
});

t("o herói não escreve no estado do sistema", ()=>{
  if(/S\.motors\s*=|saveState\(|setAuto\(/.test(HERO))
    throw new Error("o herói mexe no sistema");
});

t("o aviso de que não é previsão continua na tela", ()=>{
  const limpo = semComentarios(HTML);
  if(!/não é previsão/.test(limpo)) throw new Error("o aviso sumiu");
  if(!/170 medições|~170/.test(limpo)) throw new Error("a evidência sumiu");
});

console.log("\n" + "=".repeat(62));
console.log(`${ok} passaram · ${bad} falharam`);
if(bad){ console.log("\nFALHAS:"); falhas.forEach(f=>console.log("  "+f)); process.exit(1); }
console.log("v137 verde — o herói responde \"e aí?\" e para por aí.");
