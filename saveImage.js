// saveImage.js (v2) - robust card capture & save
// Uses html2canvas when available; falls back to simple SVG foreignObject capture.
(async function(){
  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  async function nodeToBlobWithHtml2Canvas(node, fileType="image/png"){
    // Ensure images are loaded
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(imgs.map(img=>{
      if (img.complete && img.naturalWidth>0) return Promise.resolve();
      return new Promise(res=>{
        const done=()=>res();
        img.addEventListener("load", done, {once:true});
        img.addEventListener("error", done, {once:true});
      });
    }));
    // A tiny delay helps iOS paint before capture
    await sleep(60);

    const canvas = await window.html2canvas(node, {
      backgroundColor: null,
      useCORS: true,
      scale: Math.max(2, window.devicePixelRatio || 2),
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });

    return new Promise((resolve)=>canvas.toBlob(resolve, fileType, 0.95));
  }

  async function nodeToBlobFallback(node, fileType="image/png"){
    const rect = node.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);

    const clone = node.cloneNode(true);
    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-99999px";
    wrapper.style.top = "0";
    wrapper.style.width = width + "px";
    wrapper.style.height = height + "px";
    wrapper.style.background = "transparent";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    const style = document.createElement("style");
    style.textContent = `
      * { box-sizing: border-box; }
      img { max-width: 100%; }
    `;
    wrapper.appendChild(style);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml">${wrapper.innerHTML}</div>
        </foreignObject>
      </svg>
    `;
    const svgBlob = new Blob([svg], {type:"image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    await new Promise((resolve)=>{ img.onload=resolve; img.onerror=resolve; img.src=url; });
    try { ctx.drawImage(img, 0, 0); } catch(e) {}

    URL.revokeObjectURL(url);
    document.body.removeChild(wrapper);

    return new Promise((resolve)=>canvas.toBlob(resolve, fileType, 0.95));
  }

  async function nodeToBlob(node, fileType="image/png"){
    if (window.html2canvas) {
      const blob = await nodeToBlobWithHtml2Canvas(node, fileType);
      if (blob) return blob;
    }
    return nodeToBlobFallback(node, fileType);
  }

  async function shareOrDownloadBlob(blob, filename){
    if (!blob) throw new Error("画像生成に失敗しました");
    const file = new File([blob], filename, {type: blob.type || "image/png"});

    // iOS Safari: Web Share (files) -> 「画像を保存」で写真へ
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: filename });
      return {method:"share"};
    }

    // Fallback: direct download
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
    return {method:"download"};
  }

  async function __saveCardToImage(cardId="resultCard", filename="result-card.png"){
    const node = document.getElementById(cardId);
    if (!node) throw new Error("カード要素が見つかりません: " + cardId);
    const blob = await nodeToBlob(node, "image/png");
    return shareOrDownloadBlob(blob, filename);
  }

  window.__saveCardToImage = __saveCardToImage;
})();
