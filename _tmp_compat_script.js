const selMe = document.getElementById("me");
  const selYou = document.getElementById("you");
  const btnDecide = document.getElementById("btnDecide");

  function addOptions(sel){
    sel.innerHTML = "";
    Object.entries(TYPES).forEach(([key, t])=>{
      const o = document.createElement("option");
      o.value = key;
      o.textContent = t.label;
      sel.appendChild(o);
    });
  }
  addOptions(selMe);
  addOptions(selYou);

  const q = parseQuery();
  if (q.me && TYPES[q.me]) selMe.value = q.me;
  if (q.you && TYPES[q.you]) selYou.value = q.you;

  const $ = (id)=>document.getElementById(id);

  // Selection preview (always updates)
  function renderSelections(){
    const meKey = selMe.value;
    const youKey = selYou.value;
    const me = TYPES[meKey];
    const you = TYPES[youKey];

    $("meImg").src = me.img;
    $("meLabel").textContent = me.label;
    $("meCatch").textContent = me.catch;

    $("youImg").src = you.img;
    $("youLabel").textContent = you.label;
    $("youCatch").textContent = you.catch;

    // When selection changes, ask user to decide again
    $("grade").textContent = "💖 相性：—";
    $("stars").textContent = "—";
    $("msg").textContent = "タイプを選んだら「決定」を押してね";
    $("urlLine").textContent = "";

    // keep URL updated for reload, but don't show result until decide
    const newUrl = `?me=${encodeURIComponent(meKey)}&you=${encodeURIComponent(youKey)}`;
    history.replaceState(null, "", newUrl);
  }

  // Result render (only when decided)
  function renderResult(){
    const meKey = selMe.value;
    const youKey = selYou.value;
    const me = TYPES[meKey];
    const you = TYPES[youKey];

    const r = prettyCompatibility(meKey, youKey);
    $("grade").textContent = `💖 相性：${r.percent}%`;
    $("stars").textContent = r.stars;
    $("msg").textContent = r.msg;

    const url = `${baseUrl()}/compatibility.html?me=${encodeURIComponent(meKey)}&you=${encodeURIComponent(youKey)}`;
    $("urlLine").textContent = url;

    $("btnCopy").onclick = async ()=>{
      await copyText(url);
      $("btnCopy").textContent = "コピーしました！";
      setTimeout(()=>$("btnCopy").textContent="相性URLをコピー", 1200);
    };

    const shareText = `相性どうぶつ12タイプ診断：${me.label} × ${you.label}
相性：${r.percent}% ${r.stars}
${r.msg}
👇どうぶつ12タイプ診断はこちら`;
    $("btnShare").href =
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(baseUrl()+"/index.html")}`;
  }

  // Decide button
  if (btnDecide){
    btnDecide.addEventListener("click", ()=>{
      renderResult();
      btnDecide.textContent = "この組み合わせで決定 ✓";
      setTimeout(()=>btnDecide.textContent="この組み合わせで決定", 1200);
    });
  }

  // Save compatibility card to album
  const btnSave = $("btnSaveCompat");
  if (btnSave){
    btnSave.addEventListener("click", async ()=>{
      const old = btnSave.textContent;
      btnSave.textContent = "保存準備中…";
      btnSave.disabled = true;
      try{
        const meKey = selMe.value;
        const youKey = selYou.value;
        await window.__saveCardToImage("compatCard", `12type_compat_${meKey}_${youKey}.png`);
        btnSave.textContent = "保存できました！";
        setTimeout(()=>{ btnSave.textContent = old; btnSave.disabled = false; }, 1400);
      }catch(e){
        console.error(e);
        alert("保存に失敗しました。もう一度お試しください。");
        btnSave.textContent = old;
        btnSave.disabled = false;
      }
    });
  }

  // events
  selMe.addEventListener("change", renderSelections);
  selYou.addEventListener("change", renderSelections);

  renderSelections();

  // If URL already has both params, auto-render result once (so shared links show result)
  if (q.me && q.you && TYPES[q.me] && TYPES[q.you]) {
    renderResult();
  }