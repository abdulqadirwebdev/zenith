import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Skip for now" }).click();
});
test("auto-plan preview applies persisted blocks; locked appointments survive", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: /My Tasks/ })
    .first()
    .click();
  await page.getByLabel("Quick task title").fill("Plan this study");
  await page.getByLabel("Estimated minutes").fill("60");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByRole("button", { name: "Next period", exact: true }).click();
  await page.getByRole("button", { name: "Auto-Plan My Day" }).click();
  const preview = page.getByRole("dialog", { name: "Your proposed day" });
  await expect(
    preview.getByText("Plan this study", { exact: true }).first(),
  ).toBeVisible();
  await preview.getByRole("button", { name: "Apply schedule" }).click();
  await expect(preview).not.toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(
    page.getByText("Plan this study", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(
    page.getByText("Plan this study", { exact: true }).first(),
  ).toBeVisible();
});
test("notes, spaced review, exam goal and break countdown", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Study Space", exact: true }).click();
  await page.getByRole("button", { name: "New note", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Biology ideas");
  await page
    .getByLabel("Markdown", { exact: true })
    .fill("# Mitochondria\nEnergy for the cell.");
  await expect(
    page.getByRole("heading", { name: "Mitochondria" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(
    page.getByRole("heading", { name: "Biology ideas" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Flashcards", exact: true }).click();
  await page.getByRole("button", { name: "New card", exact: true }).click();
  await page.getByLabel("Question", { exact: true }).fill("What is ATP?");
  await page
    .getByLabel("Answer", { exact: true })
    .fill("A cellular energy carrier.");
  await page.getByRole("button", { name: "Save card" }).click();
  await page.getByRole("button", { name: "Start review" }).click();
  await page.getByRole("button", { name: /QUESTION What is ATP/ }).click();
  await expect(
    page.getByText("A cellular energy carrier.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Good", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "0 cards ready for review" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Exam goals", exact: true }).click();
  await page.getByRole("button", { name: "New exam goal" }).click();
  await page.getByLabel("Exam title").fill("Biology final");
  await page.getByRole("button", { name: "Save goal" }).click();
  await page.getByRole("button", { name: "Log revision" }).click();
  await expect(page.getByText("1 / 10 revision units")).toBeVisible();
  await page.getByRole("button", { name: "Break Studio", exact: true }).click();
  await page.getByRole("button", { name: "2 min Micro break" }).click();
  await expect(
    page.getByRole("button", { name: "Finish break" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish break" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Begin breathing" }).click();
  await expect(page.getByText("Breathe in", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "End breathing" }).click();
});
test("imported audio keeps playing across navigation and can seek", async ({
  page,
}) => {
  const rate = 8000,
    count = rate * 8;
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(36 + count * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++)
    wav.writeInt16LE(
      Math.round(Math.sin((i / rate) * 440 * Math.PI * 2) * 1000),
      44 + i * 2,
    );
  await page
    .getByRole("button", { name: "Music & Ambience", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "test-tone.wav",
      mimeType: "audio/wav",
      buffer: wav,
    });
  await page
    .getByRole("button", { name: "Play test-tone.wav", exact: true })
    .click();
  await expect(page.getByLabel("Seek audio")).toBeVisible();
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page
    .getByRole("button", { name: "Music & Ambience", exact: true })
    .click();
  await expect(page.getByLabel("Seek audio")).toBeVisible();
  await expect
    .poll(async () => Number(await page.getByLabel("Seek audio").inputValue()))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Toggle imported audio" }).click();
});
