const express = require('express');
const router = express.Router();

// 🎨 FRONTEND RENDERER (Dynamic Content)
module.exports = function (app, db) {
    console.log('✅ Dynamic Frontend Renderer Initialized');

    // Helper: Get Page Content
    const getPageContent = (slug) => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM cms_pages WHERE slug = ? AND status = "published" LIMIT 1', [slug], (err, pages) => {
                if (err) return reject(err);
                if (!pages || pages.length === 0) return resolve(null);

                const page = pages[0];
                db.query('SELECT * FROM cms_sections WHERE page_id = ? AND enabled = TRUE ORDER BY display_order', [page.id], (err, sections) => {
                    if (err) return reject(err);

                    // Parse JSON content
                    page.sections = sections.map(s => {
                        try {
                            s.content = JSON.parse(s.content);
                        } catch (e) {
                            s.content = {};
                        }
                        return s;
                    });
                    resolve(page);
                });
            });
        });
    };

    // 1. Dynamic Page Route (Generic)
    app.get('/:slug', async (req, res, next) => {
        const slug = req.params.slug;
        const ignoredPaths = ['admin', 'auth', 'login', 'logout', 'api', 'uploads', 'images', 'style.css', 'script.js'];

        if (ignoredPaths.includes(slug)) return next();

        try {
            const page = await getPageContent(slug);
            if (!page) return next(); // Not found -> 404 handler

            res.render('dynamic_page', {
                page: page,
                sections: page.sections,
                title: page.title
            });
        } catch (err) {
            console.error('Page Render Error:', err);
            next(err);
        }
    });

    // 2. Homepage Override
    app.get('/', async (req, res, next) => {
        try {
            // Check if dynamic homepage exists
            db.query('SELECT slug FROM cms_pages WHERE is_homepage = TRUE AND status = "published" LIMIT 1', async (err, result) => {
                if (result && result.length > 0) {
                    const page = await getPageContent(result[0].slug);
                    return res.render('dynamic_page', {
                        page: page,
                        sections: page.sections,
                        title: page.title
                    });
                }
                // Fallback to static index.ejs if no dynamic homepage
                res.render('index');
            });
        } catch (err) {
            next(err);
        }
    });
};
