import puppeteer from 'puppeteer';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/', async (c) => {
    try {
        const url = c.req.query('url') || 'https://apify.com';

        // **Colle les options de Puppeteer ici :**
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: '/usr/bin/google-chrome-stable'
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Clique sur le bouton si besoin
        const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
        if (button) {
            await button.click();
            await page.waitForTimeout(1000);
        }

        // Cherche la vidéo
        await page.waitForFunction(() => document.querySelector('video')?.src, { timeout: 60000 }).catch(() => { });
        let videoUrl = await page.$eval('video', video => video.src).catch(() => null);

        // Cherche dans les iframes si besoin
        if (!videoUrl) {
            for (const frame of page.frames()) {
                try {
                    videoUrl = await frame.$eval('video', video => video.src);
                    if (videoUrl) break;
                } catch (e) { continue; }
            }
        }

        // Intercepte les requêtes médias si besoin
        if (!videoUrl) {
            page.on('response', async response => {
                if (response.request().resourceType() === 'media') {
                    videoUrl = response.url();
                }
            });
            await page.waitForTimeout(5000);
        }

        await browser.close();

        // Retourne le résultat en JSON
        return c.json({
            page: url,
            videoUrl: videoUrl || null,
            status: videoUrl ? 'ok' : 'not found'
        });
    } catch (err) {
        console.error(err); // Log l'erreur pour le débogage
        return c.json({
            error: 'Scraping failed',
            message: err.message,
            stack: err.stack
        }, 500);
    }
});

serve({ fetch: app.fetch, port: 8080 });
console.log('Serveur lancé sur le port 8080');
