// Save card as image without external libs (works on mobile)
// Uses SVG foreignObject render -> Canvas -> Blob, then Web Share API when available.
async function elementToBlob(el, scale = 2) {
  const rect = el.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  // Clone node and make image src absolute to avoid resolution issues inside SVG
  const clone = el.cloneNode(true);
  clone.style.margin = "0";
  clone.style.transform = "none";
  clone.style.boxSizing = "border-box";

  const imgs = clone.querySelectorAll("img");
  imgs.forEach(img => {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:")) {
      try { img.setAttribute("src", new URL(src, window.location.href).href); } catch (_) {}
      // avoid lazy-load
      img.setAttribute("loading", "eager");
      img.setAttribute("decoding", "sync");
      img.crossOrigin = "anonymous";
    }
  });

  // Collect CSS rules (best effort)
  let cssText = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const r of Array.from(rules)) cssText += r.cssText + "\n";
    } catch (e) {
      // cross-origin stylesheet; ignore
    }
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}">
      <foreignObject width="100%" height="100%" transform="scale(${scale})">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <style>
            ${cssText}
            /* Ensure consistent render inside foreignObject */
            * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
            body { margin: 0; }
          </style>
          ${serialized}
        </div>
      </foreignObject>
    </svg>
  `.trim();

  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");

  // white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1.0));
}

async function saveElementAsImage(el, filenameBase = "card") {
  try {
    // Ensure fonts/images have a moment to settle
    await (document.fonts ? document.fonts.ready : Promise.resolve());
    const blob = await elementToBlob(el, 2);
    if (!blob) throw new Error("blob_failed");

    const file = new File([blob], `${filenameBase}.png`, { type: "image/png" });

    // Prefer native share (iOS: share sheet -> "写真に保存" が出る)
    if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: "結果カード" });
      return;
    }

    // Fallback: open image in new tab (long-press -> Save Image)
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    // If blocked, fallback to download
    if (!w) {
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    console.error(e);
    alert("保存に失敗しました。Safariの場合は、共有ボタンから保存を試してください。");
  }
}
