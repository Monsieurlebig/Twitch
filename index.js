const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function scrapeVideoUrl(startUrl) {
    // Création des options Chrome en mode headless
    const options = new chrome.Options();
    options.addArguments('--headless', '--disable-gpu', '--no-sandbox');

    // Lance Chrome en mode headless avec les options
    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    try {
        await driver.get(startUrl);

        // Clique sur le bouton "Commencer à regarder" s'il existe
        try {
            const button = await driver.wait(
                until.elementLocated(By.css('[data-a-target="content-classification-gate-overlay-start-watching-button"]')),
                3000
            );
            await button.click();
            await driver.sleep(1000);
            console.log("Bouton cliqué !");
        } catch (e) {
            console.log("Pas de bouton à cliquer.");
        }

        // Attend la présence de la vidéo
        await driver.wait(async () => {
            const video = await driver.findElements(By.css('video'));
            if (video.length === 0) return false;
            const src = await video[0].getAttribute('src');
            return !!src;
        }, 15000);

        // Récupère le src de la vidéo
        let videoUrl = null;
        try {
            const video = await driver.findElement(By.css('video'));
            videoUrl = await video.getAttribute('src');
        } catch (e) {
            // Pas trouvé dans la page principale
        }

        // Si pas trouvé, cherche dans les iframes
        if (!videoUrl) {
            const iframes = await driver.findElements(By.tagName('iframe'));
            for (let iframe of iframes) {
                await driver.switchTo().frame(iframe);
                try {
                    const video = await driver.findElement(By.css('video'));
                    videoUrl = await video.getAttribute('src');
                    if (videoUrl) break;
                } catch (e) {}
                await driver.switchTo().defaultContent();
            }
        }

        // Affiche le résultat
        if (videoUrl) {
            console.log(`Clip URL: ${videoUrl}`);
        } else {
            console.log("Aucune URL de vidéo trouvée.");
        }

        return videoUrl;
    } finally {
        await driver.quit();
    }
}

// Utilisation : node index.js <url>
const startUrl = process.argv[2] || 'https://apify.com';
scrapeVideoUrl(startUrl);
