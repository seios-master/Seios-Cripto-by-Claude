/* =====================================================================
   BLOCO v89 — proxy próprio do FRED
   =====================================================================
   Cole no fim do harness.js, antes do resumo final.
   Os seis testes falham na v88: fredUrl não existia.
   ===================================================================== */
(function blocoFredProxyV89(){
  bloco("v89 — FRED via /api/fred");

  const fredUrl      = extrai("fredUrl");
  const fredRealtime = extrai("fredRealtime");
  const urlProprio   = extrai("urlProprioServidor");

  // 1. leitura ao vivo
  eq("fredUrl: leitura ao vivo",
     fredUrl({ series_id:"DFF", sort_order:"desc", limit:95 }),
     "/api/fred?series_id=DFF&sort_order=desc&limit=95");

  // 2. backtest simples
  eq("fredUrl: observation_start",
     fredUrl({ series_id:"SP500", sort_order:"asc", observation_start:"2025-01-01" }),
     "/api/fred?series_id=SP500&observation_start=2025-01-01&sort_order=asc");

  // 3. vintage completo — o caminho que protege contra look-ahead
  const rt = fredRealtime("2025-01-01");
  eq("fredUrl: vintage output_type=4",
     fredUrl(Object.assign({ series_id:"CPIAUCSL", sort_order:"asc",
                             observation_start:"2025-01-01" }, rt, { output_type:4 })),
     "/api/fred?series_id=CPIAUCSL&observation_start=2025-01-01"
       + "&realtime_start=2025-01-01"
       + "&realtime_end=" + new Date().toISOString().slice(0,10)
       + "&output_type=4&sort_order=asc");

  /* 4. A REGRA QUE JUSTIFICA A v89 INTEIRA.
        Se algum dia alguém reintroduzir api_key na URL do cliente, a chave
        volta a atravessar o navegador e — se o proxy público for acionado —
        um terceiro. Este teste é a trava. */
  eq("fredUrl: nunca carrega api_key",
     /api_key/i.test(fredUrl({ series_id:"DFF", limit:5 })) ? "VAZOU" : "limpo",
     "limpo");

  // 5. mesma origem: sem isso, smartFetch mandaria a rota pro allorigins
  eq("urlProprioServidor: /api/fred", urlProprio("/api/fred?series_id=DFF"), true);
  eq("urlProprioServidor: externa",
     urlProprio("https://api.coingecko.com/api/v3/ping"), false);

  /* 6. realtime_end verificado, não suposto. 9999-12-31 funcionava na chamada
        direta mas nunca foi testado contra o proxy; a data de hoje foi. */
  eq("fredRealtime: realtime_end é hoje, não 9999-12-31",
     rt.realtime_end === "9999-12-31" ? "nao-verificado" : "verificado",
     "verificado");
})();

/* =====================================================================
   BLOCO v90 — ALFRED ≠ FRED
   =====================================================================
   Falha na v89: erroSemVintage não existia, e o fallback de vintage
   estava pendurado abaixo do ponto onde a execução caía.
   ===================================================================== */
(function blocoAlfredV90(){
  bloco("v90 — vintage indisponível ≠ série indisponível");

  const erroSemVintage = extrai("erroSemVintage");

  // a assinatura exata que o FRED devolveu no SP500 em 15/08/2026
  eq("400 do ALFRED é sem-vintage",
     erroSemVintage(new Error("FRED falhou: SP500 (status 400)")), true);
  eq("mensagem do ALFRED é sem-vintage",
     erroSemVintage(new Error("The series does not exist in ALFRED but may exist in FRED.")), true);

  // e o que NÃO pode ser confundido com estrutural
  eq("timeout não é sem-vintage",
     erroSemVintage(new Error("tempo esgotado após 25s")), false);
  eq("502 não é sem-vintage",
     erroSemVintage(new Error("status 502 em /api/fred")), false);

  /* O conserto propriamente dito: a rede de segurança precisa estar ACIMA
     do ponto onde a execução cai, não abaixo. */
  const corpo = fonteDe("fetchFredSeriesRange");
  eq("vintage roda dentro de try/catch", /try\{[\s\S]*catch\s*\(e\)/.test(corpo), true);
  eq("fallback dispara por motivo", /if\(motivoSemVintage\)/.test(corpo), true);
  eq("registra o motivo junto do id", /motivo:\s*motivoSemVintage/.test(corpo), true);
})();
