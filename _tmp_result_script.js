const q = parseQuery();
  const typeKey = (q.type && TYPES[q.type]) ? q.type : "moon_cat";
  const t = TYPES[typeKey];

  document.getElementById("typeImg").src = t.img;
  document.getElementById("typeLabel").textContent = t.label;
  document.getElementById("typeCatch").textContent = t.catch;

  function fillList(id, items){
    const ul = document.getElementById(id);
    ul.innerHTML = "";
    items.forEach(s=>{
      const li = document.createElement("li");
      li.textContent = s;
      ul.appendChild(li);
    });
  }
  fillList("listPersonality", t.personality);
  fillList("listWork", t.work);
  fillList("listLove", t.love);

  const bestWrap = document.getElementById("bestWrap");
  bestWrap.innerHTML = t.best.map(k=>`・${TYPES[k].label}`).join("<br/>");

  const url = location.href;
  document.getElementById("urlLine").textContent = url;

  document.getElementById("btnCopy").addEventListener("click", async ()=>{
    await copyText(url);
    document.getElementById("btnCopy").textContent = "コピーしました！";
    setTimeout(()=>document.getElementById("btnCopy").textContent="結果URLをコピー", 1200);
  });

  const shareText = `私は【${t.label}】でした！\n${t.catch}\nどうぶつ12タイプ診断はこちら👇`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url.replace(/result\.html.*/, "index.html"))}`;
  document.getElementById("btnX").href = xUrl;

  document.getElementById("btnCompat").href = `compatibility.html?me=${encodeURIComponent(typeKey)}`;

  async function saveCardAsImage(){
    // Wait for webfonts (helps iOS/Android render text reliably before canvas export)
    try{ if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch(e) {}

    // Build a 1080x1080 shareable card
    const size = 1080;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Background (yume-kawa retro)
    const g = ctx.createLinearGradient(0,0,size,size);
    g.addColorStop(0, "rgba(255,159,214,0.95)");
    g.addColorStop(0.5, "rgba(183,166,255,0.92)");
    g.addColorStop(1, "rgba(142,231,255,0.90)");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,size,size);

    // Soft paper grain
    ctx.globalAlpha = 0.10;
    for (let i=0;i<1400;i++){
      const x = Math.random()*size;
      const y = Math.random()*size;
      const r = Math.random()*1.2;
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 0.20;

    // Retro dots
    const step = 18;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let y=10;y<size;y+=step){
      for (let x=10;x<size;x+=step){
        ctx.beginPath(); ctx.arc(x,y,1.2,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(0,0,size,size);

    // Frame
    const pad = 44;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(pad, pad, size-pad*2, size-pad*2);

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 8;
    ctx.strokeRect(pad, pad, size-pad*2, size-pad*2);

    // Title ribbon
    ctx.fillStyle = "rgba(255,204,0,0.92)";
    ctx.fillRect(pad, pad, size-pad*2, 120);
    ctx.fillStyle = "#1a1200";
    ctx.font = "900 58px 'Noto Sans JP', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("どうぶつ12タイプ診断", pad+26, pad+60);

    // Character image (square)
    const img = new Image();
    // Avoid "tainted canvas" issues on some in-app browsers
    img.crossOrigin = "anonymous";
    img.src = t.img;
    await new Promise((ok, ng)=>{ img.onload=ok; img.onerror=ng; });

    const imgSize = 560;
    const imgX = (size - imgSize)/2;
    const imgY = pad + 150;
    // image frame
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(imgX-10, imgY-10, imgSize+20, imgSize+20);
    ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

    // Type label
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "900 56px 'Noto Sans JP', system-ui, sans-serif";
    const label = t.label;
    const textY = imgY + imgSize + 110;
    ctx.textAlign = "center";
    ctx.fillText(label, size/2, textY);

    // Catch copy (wrap)
    ctx.fillStyle = "rgba(238,242,255,0.92)";
    ctx.font = "800 38px 'Noto Sans JP', system-ui, sans-serif";
    const catchText = t.catch;
    const maxWidth = size - pad*2 - 80;
    const words = catchText.split("");
    let line = "";
    let lines = [];
    for (const ch of words){
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth){
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const startY = textY + 74;
    lines = lines.slice(0,2);
    lines.forEach((ln,i)=>{
      ctx.fillText(ln, size/2, startY + i*50);
    });


    // Summary (80-100 chars)
    const summary = (t.cardSummary || "").trim();
    if (summary){
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.font = '700 36px "M PLUS Rounded 1c","Zen Maru Gothic",sans-serif';
      ctx.fillStyle = "rgba(35,26,58,0.90)";
      ctx.textAlign = "left";
      const maxW2 = size - pad*2;
      const sumLines = wrapText(summary, maxW2, ctx).slice(0,3);
      const y0 = size - pad - 120;
      const lh2 = 44;
      sumLines.forEach((ln,i)=>ctx.fillText(ln, pad, y0 + i*lh2));
      ctx.restore();
    }

    // Brand mark
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.font = '900 44px "M PLUS Rounded 1c","Zen Maru Gothic",sans-serif';
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText("どうぶつ12タイプ診断", size - pad, size - pad);
    ctx.restore();

    // Share Sheet (iOS/Android) -> 「写真に保存」でアルバムへ
    const blob = await new Promise(resolve=>canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      // Safari fallback
      const a0 = document.createElement("a");
      a0.download = `12typeQA_${typeKey}.png`;
      a0.href = canvas.toDataURL("image/png");
      a0.click();
      return;
    }
    const file = new File([blob], `12typeQA_${typeKey}.png`, { type: "image/png" });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try{
        await navigator.share({ title:"どうぶつ12タイプ診断", text:"結果カードを保存してね！", files:[file] });
        return;
      }catch(e){
        // fallback below
      }
    }

    // Fallback: download / open image (iOS friendly)
    const dataUrl = canvas.toDataURL("image/png");
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent);

    // iOS Safari doesn't reliably honor the download attribute.
    // Open the image in a new tab so the user can long-press and save to Photos.
    if (isIOS) {
      const w = window.open("");
      if (w) {
        w.document.write('<meta name="viewport" content="width=device-width, initial-scale=1">');
        w.document.write('<title>どうぶつ12タイプ診断</title>');
        w.document.write('<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;padding:12px;line-height:1.4;">');
        w.document.write('<div style="font-weight:700;margin-bottom:6px;">結果カードを保存</div>');
        w.document.write('<div style="font-size:14px;opacity:.8;margin-bottom:10px;">画像を<strong>長押し</strong>して「写真に保存」を選んでね。</div>');
        w.document.write('</div>');
        w.document.write(`<img src="${dataUrl}" style="width:100%;height:auto;display:block;">`);
        w.document.close();
      } else {
        // Popup blocked: navigate to image
        window.location.href = dataUrl;
      }
      return;
    }

    const a = document.createElement("a");
    a.download = `12typeQA_${typeKey}.png`;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

  
  // Save card to album (Web Share on iOS/LINE in-app browsers when available)
  document.getElementById("btnSave").addEventListener("click", async ()=>{
    const btn = document.getElementById("btnSave");
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = "保存準備中…";
    try{
      // saveImage.js exposes: __saveCardToImage(cardId, filename)
      await window.__saveCardToImage("resultCard", `12type_result_${typeKey}.png`);
      btn.textContent = "保存できました！";
      setTimeout(()=>{ btn.textContent = old; btn.disabled = false; }, 1400);
    }catch(e){
      console.error(e);
      alert("保存に失敗しました。もう一度お試しください。");
      btn.textContent = old;
      btn.disabled = false;
    }
  });