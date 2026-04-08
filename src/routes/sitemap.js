import { Router } from 'express';
import Product from '../models/Product.js';

const router = Router();

const SITE = 'https://hamedosport.com';

const url = (loc, changefreq = 'weekly', priority = '0.7') =>
  `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true }).select('slug updatedAt').lean();

    const staticUrls = [
      url(`${SITE}/`,                'daily',  '1.0'),
      url(`${SITE}/shop`,            'daily',  '0.9'),
      url(`${SITE}/shop/padel`,      'daily',  '0.8'),
      url(`${SITE}/shop/football`,   'daily',  '0.8'),
      url(`${SITE}/shop/rackets`,    'weekly', '0.7'),
      url(`${SITE}/shop/clothes`,    'weekly', '0.7'),
      url(`${SITE}/shop/socks`,      'weekly', '0.7'),
      url(`${SITE}/shop/accessories`,'weekly', '0.7'),
    ];

    const productUrls = products.map(p =>
      `  <url>\n    <loc>${SITE}/product/${p.slug}</loc>\n    <lastmod>${new Date(p.updatedAt).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    );

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...productUrls].join('\n')}\n</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache for 1 hour
    res.send(xml);
  } catch (err) {
    res.status(500).send('Sitemap generation failed');
  }
});

export default router;
