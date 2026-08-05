/** Pulse the browser tab favicon while a long action (e.g. Paystack) is loading. */

let pulseTimer: number | null = null;
let originalHref: string | null = null;

function faviconLink(): HTMLLinkElement {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  return link;
}

function drawPulsingFavicon(
  img: HTMLImageElement,
  progress: number,
): string {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;

  // Soft brand wash
  ctx.clearRect(0, 0, size, size);
  const pulse = 0.55 + 0.45 * Math.sin(progress * Math.PI * 2);
  const scale = 0.72 + 0.28 * pulse;

  // Ring progress
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(30, 104, 71, ${0.12 + 0.18 * pulse})`;
  ctx.fill();

  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);
  ctx.translate(-size / 2, -size / 2);
  ctx.drawImage(img, 4, 4, size - 8, size - 8);
  ctx.restore();

  // Progress arc
  ctx.beginPath();
  ctx.arc(
    size / 2,
    size / 2,
    size / 2 - 3,
    -Math.PI / 2,
    -Math.PI / 2 + progress * Math.PI * 2,
  );
  ctx.strokeStyle = "#1e6847";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.stroke();

  // Accent tip
  ctx.beginPath();
  ctx.arc(
    size / 2,
    size / 2,
    size / 2 - 3,
    -Math.PI / 2 + progress * Math.PI * 2 - 0.15,
    -Math.PI / 2 + progress * Math.PI * 2,
  );
  ctx.strokeStyle = "#d65c33";
  ctx.lineWidth = 4;
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

export function startFaviconPulse(src = "/favicon.png") {
  if (typeof window === "undefined") return () => {};
  stopFaviconPulse();

  const link = faviconLink();
  originalHref = link.href || src;

  const img = new Image();
  img.crossOrigin = "anonymous";
  let frame = 0;
  let ready = false;

  img.onload = () => {
    ready = true;
  };
  img.src = src;

  pulseTimer = window.setInterval(() => {
    if (!ready) return;
    frame = (frame + 1) % 40;
    const progress = frame / 40;
    try {
      link.href = drawPulsingFavicon(img, progress);
    } catch {
      /* ignore canvas / tainted canvas issues */
    }
  }, 50);

  return stopFaviconPulse;
}

export function stopFaviconPulse() {
  if (pulseTimer != null) {
    window.clearInterval(pulseTimer);
    pulseTimer = null;
  }
  if (typeof document !== "undefined" && originalHref) {
    const link = faviconLink();
    link.href = originalHref;
    originalHref = null;
  }
}
