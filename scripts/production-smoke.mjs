import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.TARGET_URL || 'http://localhost:4173');
await page.getByRole('button',{name:'Skip for now'}).click();
for(const [name,heading] of [['My Tasks','My Tasks'],['Focus Studio','Focus Studio'],['Schedule','Your schedule'],['Music & Ambience','Music & Ambience'],['Break Studio','Break Studio'],['Study Space','Study Space'],['Analytics','Your momentum'],['Achievements','Little wins. Lasting momentum.'],['Settings','Make it your own']]){await page.locator('.sidebar nav').getByRole('button',{name}).click();await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();}
await page.keyboard.press('Control+k');await expect(page.getByRole('dialog',{name:'Find your next move'})).toBeVisible();await page.keyboard.press('Escape');
await page.getByLabel('Theme',{exact:true}).selectOption('light');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
console.log(JSON.stringify({allPagesLoaded:true,commandPalette:true,lightTheme:true,pageErrors:errors}));
if(errors.length)throw Error(errors.join('\n'));
await browser.close();
