import { chromium, expect } from "@playwright/test";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, reducedMotion:'reduce' });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173");
await page.getByRole("button", { name: "Skip for now" }).click();
await page.getByRole("button", { name: "Settings", exact: true }).click();
await page.getByRole("button", { name: "Add example tasks" }).waitFor();
await page.getByRole("button", { name: "Add example tasks" }).click();
await page.getByRole("button", { name: "Dashboard", exact: true }).click();
await page.getByText("Review calculus chapter 4", { exact: true }).waitFor();
await page.locator(".toast button").click();
await expect(page.locator('.toast')).toHaveCount(0);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: "docs/desktop-render.png", fullPage: false });
await page.setViewportSize({ width: 390, height: 844 });
await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
await page.screenshot({ path: "docs/mobile-dashboard.png", fullPage: false });
for (const [button, title] of [
  ["Tasks", "My Tasks"],
  ["Focus", "Focus Studio"],
  ["Plan", "Your schedule"],
  ["Sounds", "Music & Ambience"],
]) {
  await page.getByRole("button", { name: button, exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  console.log(button, { overflow });
  await page.screenshot({
    path: `docs/mobile-${button.toLowerCase()}.png`,
    fullPage: true,
  });
}
console.log({ errors });
await browser.close();
