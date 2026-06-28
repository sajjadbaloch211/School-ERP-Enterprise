const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure Multer for CMS Assets
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/cms/';
        // Ensure directory exists
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'cms-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

module.exports = function (app, db, csrfProtection, logSecurityEvent, requireAdmin) {

    // 1. CMS Dashboard Redirection
    app.get('/admin/cms', requireAdmin, (req, res) => {
        res.redirect('/admin/cms/pages');
    });

    // 2. THEME CUSTOMIZER (Existing)
    app.get('/admin/cms/theme', requireAdmin, csrfProtection, (req, res) => {
        db.query('SELECT * FROM cms_themes WHERE is_active = TRUE LIMIT 1', (err, results) => {
            let theme = { colors: {}, fonts: {}, button_styles: {} };
            if (results && results.length > 0) {
                const t = results[0];
                theme = {
                    ...t,
                    colors: typeof t.colors === 'string' ? JSON.parse(t.colors) : t.colors,
                    fonts: typeof t.fonts === 'string' ? JSON.parse(t.fonts) : t.fonts,
                    button_styles: typeof t.button_styles === 'string' ? JSON.parse(t.button_styles) : t.button_styles
                };
            }
            res.render('admin/cms/theme', {
                theme,
                csrfToken: req.csrfToken(),
                active: 'cms',
                user: req.session.user,
                campus: req.session.campus
            });
        });
    });

    app.post('/admin/cms/theme', requireAdmin, csrfProtection, (req, res) => {
        const { primary, secondary, accent, background, text, headingFont, bodyFont, borderRadius } = req.body;

        const colors = JSON.stringify({ primary, secondary, accent, background, text });
        const fonts = JSON.stringify({ heading: headingFont, body: bodyFont });
        const button_styles = JSON.stringify({ borderRadius, shadow: 'none' });

        const query = `UPDATE cms_themes SET colors = ?, fonts = ?, button_styles = ? WHERE is_active = TRUE`;
        db.query(query, [colors, fonts, button_styles], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error updating theme');
            }
            logSecurityEvent(req, req.session.user, 'UPDATE_THEME');
            res.redirect('/admin/cms/theme?success=true');
        });
    });

    // 3. PAGES MANAGER
    app.get('/admin/cms/pages', requireAdmin, (req, res) => {
        db.query('SELECT * FROM cms_pages ORDER BY is_homepage DESC, title ASC', (err, pages) => {
            if (err) return res.status(500).send('Database Error');
            res.render('admin/cms/pages', {
                pages,
                active: 'cms',
                user: req.session.user,
                campus: req.session.campus
            });
        });
    });

    app.get('/admin/cms/pages/edit/:id', requireAdmin, csrfProtection, (req, res) => {
        const pageId = req.params.id;
        db.query('SELECT * FROM cms_pages WHERE id = ?', [pageId], (err, pages) => {
            if (err || !pages.length) return res.redirect('/admin/cms/pages');

            const page = pages[0];
            db.query('SELECT * FROM cms_sections WHERE page_id = ? ORDER BY display_order', [pageId], (err, sections) => {
                const parsedSections = sections.map(s => ({
                    ...s,
                    content: typeof s.content === 'string' ? JSON.parse(s.content) : s.content
                }));

                res.render('admin/cms/page_editor', {
                    page,
                    sections: parsedSections,
                    csrfToken: req.csrfToken(),
                    active: 'cms',
                    user: req.session.user,
                    campus: req.session.campus
                });
            });
        });
    });

    // 4. SECTION EDITOR
    // Simplified "Easy Understand" editor for specific sections
    app.get('/admin/cms/sections/edit/:id', requireAdmin, csrfProtection, (req, res) => {
        const sectionId = req.params.id;
        db.query('SELECT * FROM cms_sections WHERE id = ?', [sectionId], (err, results) => {
            if (err || !results.length) return res.redirect('/admin/cms/pages');

            const section = results[0];
            try {
                section.content = JSON.parse(section.content);
            } catch (e) { section.content = {} }

            res.render('admin/cms/section_editor', {
                section,
                csrfToken: req.csrfToken(),
                active: 'cms',
                user: req.session.user,
                campus: req.session.campus
            });
        });
    });

    app.post('/admin/cms/sections/update/:id', requireAdmin, upload.single('image'), csrfProtection, (req, res) => {
        const sectionId = req.params.id;
        const { heading, subheading, title, description, body } = req.body;

        // Fetch current content first to merge
        db.query('SELECT content, page_id FROM cms_sections WHERE id = ?', [sectionId], (err, results) => {
            if (err || !results.length) return res.status(500).send('Error');

            const section = results[0];
            let content = JSON.parse(section.content);

            // Update fields based on what was submitted
            if (heading) content.heading = heading;
            if (subheading) content.subheading = subheading;
            if (title) content.title = title;
            if (description) content.description = description;
            if (body) content.body = body;

            // Handle Image Upload
            if (req.file) {
                content.image = '/uploads/cms/' + req.file.filename;
            }

            db.query('UPDATE cms_sections SET content = ? WHERE id = ?', [JSON.stringify(content), sectionId], (err) => {
                if (err) console.error(err);
                logSecurityEvent(req, req.session.user, 'UPDATE_SECTION', { sectionId });
                res.redirect('/admin/cms/pages/edit/' + section.page_id);
            });
        });
    });

    // 4b. ADD SECTION
    app.post('/admin/cms/sections/add', requireAdmin, csrfProtection, (req, res) => {
        const { page_id, section_type, section_name } = req.body;

        // Default content structures
        let defaultContent = {};
        if (section_type === 'hero') {
            defaultContent = {
                heading: 'Welcome to Our School',
                subheading: 'Empowering the next generation.',
                cta_text: 'Learn More',
                cta_link: '/about',
                image: '/images/waqar.png' // Default placeholder
            };
        } else if (section_type === 'features') {
            defaultContent = {
                title: 'Our Features',
                description: 'Why choose us?',
                items: [
                    { title: 'Feature 1', text: 'Description here', icon: 'fas fa-star' },
                    { title: 'Feature 2', text: 'Description here', icon: 'fas fa-heart' },
                    { title: 'Feature 3', text: 'Description here', icon: 'fas fa-bolt' }
                ]
            };
        } else if (section_type === 'stats') {
            defaultContent = {
                items: [
                    { number: '1000', label: 'Students' },
                    { number: '50', label: 'Teachers' },
                    { number: '100%', label: 'Success' }
                ]
            };
        } else if (section_type === 'content') {
            defaultContent = {
                title: 'About Us',
                body: '<p>Write your content here...</p>'
            };
        }

        db.query('INSERT INTO cms_sections (page_id, section_type, section_name, content, display_order) VALUES (?, ?, ?, ?, 10)',
            [page_id, section_type, section_name, JSON.stringify(defaultContent)],
            (err) => {
                if (err) return res.status(500).send('Error adding section');
                res.redirect('/admin/cms/pages/edit/' + page_id);
            }
        );
    });

    // 4c. DELETE SECTION
    app.post('/admin/cms/sections/delete/:id', requireAdmin, csrfProtection, (req, res) => {
        const sectionId = req.params.id;
        // Get page_id first to redirect back
        db.query('SELECT page_id FROM cms_sections WHERE id = ?', [sectionId], (err, results) => {
            if (err || !results.length) return res.redirect('/admin/cms/pages');
            const pageId = results[0].page_id;

            db.query('DELETE FROM cms_sections WHERE id = ?', [sectionId], (err) => {
                logSecurityEvent(req, req.session.user, 'DELETE_SECTION', { sectionId });
                res.redirect('/admin/cms/pages/edit/' + pageId);
            });
        });
    });

    // 5. MENU MANAGER
    app.get('/admin/cms/menus', requireAdmin, (req, res) => {
        db.query('SELECT * FROM cms_menu_items ORDER BY menu_location, display_order', (err, menus) => {
            res.render('admin/cms/menus', {
                menus,
                active: 'cms',
                user: req.session.user,
                campus: req.session.campus, // Pass campus to avoid layout error
                csrfToken: req.csrfToken() // Pass CSRF token for the forms
            });
        });
    });

    app.post('/admin/cms/menus/add', requireAdmin, csrfProtection, (req, res) => {
        const { label, url, menu_location, display_order } = req.body;
        db.query('INSERT INTO cms_menu_items (label, url, menu_location, display_order, enabled) VALUES (?, ?, ?, ?, TRUE)',
            [label, url, menu_location, display_order || 0],
            (err) => {
                if (err) console.error(err);
                res.redirect('/admin/cms/menus');
            }
        );
    });

    app.post('/admin/cms/menus/delete/:id', requireAdmin, csrfProtection, (req, res) => {
        db.query('DELETE FROM cms_menu_items WHERE id = ?', [req.params.id], (err) => {
            res.redirect('/admin/cms/menus');
        });
    });

    // 6. GLOBAL SETTINGS (Logo, Name, Menus)
    app.get('/admin/cms/settings', requireAdmin, csrfProtection, (req, res) => {
        db.query('SELECT * FROM cms_settings', (err, settings) => {
            const settingMap = {};
            settings.forEach(s => settingMap[s.setting_key] = s.setting_value);

            res.render('admin/cms/settings', {
                settings: settingMap,
                csrfToken: req.csrfToken(),
                active: 'cms',
                user: req.session.user,
                campus: req.session.campus
            });
        });
    });

    app.post('/admin/cms/settings', requireAdmin, upload.single('site_logo'), csrfProtection, (req, res) => {
        const { site_name, contact_email, contact_phone, address } = req.body;

        const updates = [
            { key: 'site_name', value: site_name },
            { key: 'contact_email', value: contact_email },
            { key: 'contact_phone', value: contact_phone },
            { key: 'address', value: address }
        ];

        if (req.file) {
            updates.push({ key: 'site_logo', value: '/uploads/cms/' + req.file.filename });
        }

        // Process updates sequentially
        const updateNext = (index) => {
            if (index >= updates.length) {
                logSecurityEvent(req, req.session.user, 'UPDATE_SETTINGS');
                return res.redirect('/admin/cms/settings?success=true');
            }
            const item = updates[index];
            if (item.value) {
                db.query('INSERT INTO cms_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                    [item.key, item.value, item.value],
                    () => updateNext(index + 1)
                );
            } else {
                updateNext(index + 1);
            }
        };

        updateNext(0);
    });
};
