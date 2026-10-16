import { test, expect } from "@playwright/test";
test("onboarding, task, schedule, timer, audio, theme, backup, and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Display name").fill("Alex");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Enter my universe" }).click();
  await expect(
    page.getByRole("heading", { name: /Good .*Alex/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "My Tasks", exact: false })
    .first()
    .click();
  await page.getByLabel("Quick task title").fill("E2E Biology revision");
  await page.getByLabel("Estimated minutes").fill("30");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(
    page.getByText("E2E Biology revision", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByRole("button", { name: "New event", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Biology study block");
  await page
    .getByLabel("Linked task")
    .selectOption({ label: "E2E Biology revision" });
  await page.getByRole("button", { name: "Save event" }).click();
  await page
    .getByRole("button", { name: "My Tasks", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start E2E Biology revision" })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Focus Studio", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Finish & save" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Analytics", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Daily focus minutes" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "My Tasks", exact: false })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Complete E2E Biology revision" })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "My Tasks", exact: false })
    .first()
    .click();
  await expect(
    page.getByText("E2E Biology revision", { exact: true }),
  ).toHaveClass(/strike/);
  await page
    .getByRole("button", { name: "Music & Ambience", exact: true })
    .click();
  await page.getByRole("button", { name: "Play soundscape" }).click();
  await expect(
    page.getByRole("button", { name: "Pause soundscape" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause soundscape" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/zenith-backup.*json/);
  expect(errors).toEqual([]);
});
test("mobile navigation has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(
    page.getByRole("button", { name: "Home", exact: true }),
  ).toBeVisible();
  for (const [name, title] of [
    ["Home", /Good /],
    ["Tasks", "My Tasks"],
    ["Focus", "Focus Studio"],
    ["Plan", "Your schedule"],
    ["Sounds", "Music & Ambience"],
  ] as const) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.screenshot({ path: "docs/mobile-render.png", fullPage: true });
});
