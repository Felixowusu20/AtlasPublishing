import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

function chromeExecutable(): string {
  const fromEnv =
    process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || "";
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ];
  return candidates.find((path) => existsSync(path)) ?? "";
}

/** Print HTML with Chrome — the same engine as Print preview. */
export async function chromePrintToPdf(html: string): Promise<Buffer> {
  const executablePath = chromeExecutable();
  if (!executablePath) {
    throw new Error(
      "Google Chrome is required to generate the Nahda print PDF. Install Chrome and try Publish again.",
    );
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--hide-scrollbars",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.emulateMediaType("print");
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    await page.evaluate(async () => {
      await document.fonts.ready.catch(() => undefined);
    });
    await new Promise((resolve) => setTimeout(resolve, 250));

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
