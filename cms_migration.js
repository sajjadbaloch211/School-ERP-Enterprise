/**
 * 🎨 CMS DATABASE MIGRATION SCRIPT
 * Creates all necessary tables for dynamic website management
 * Run this ONCE: node cms_migration.js
 */

const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }
    console.log('✅ Connected to database');
    runMigration();
});

function runMigration() {
    const migrations = [
        // 1. CMS Pages Table
        `CREATE TABLE IF NOT EXISTS cms_pages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            slug VARCHAR(100) NOT NULL UNIQUE,
            title VARCHAR(255) NOT NULL,
            meta_description TEXT,
            meta_keywords VARCHAR(255),
            status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
            is_homepage BOOLEAN DEFAULT FALSE,
            created_by INT,
            updated_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_slug (slug),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Pages - Main page definitions'`,

        // 2. CMS Sections Table (Flexible Content Blocks)
        `CREATE TABLE IF NOT EXISTS cms_sections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            page_id INT NOT NULL,
            section_type VARCHAR(50) NOT NULL COMMENT 'hero, features, stats, gallery, contact, etc.',
            section_name VARCHAR(100) NOT NULL,
            content JSON NOT NULL COMMENT 'Flexible JSON content for each section type',
            display_order INT DEFAULT 0,
            enabled BOOLEAN DEFAULT TRUE,
            css_classes VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE,
            INDEX idx_page_order (page_id, display_order),
            INDEX idx_enabled (enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Sections - Page content blocks'`,

        // 3. CMS Themes Table
        `CREATE TABLE IF NOT EXISTS cms_themes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            theme_name VARCHAR(100) NOT NULL UNIQUE,
            colors JSON NOT NULL COMMENT 'Primary, secondary, accent, background colors',
            fonts JSON NOT NULL COMMENT 'Font families, sizes, weights',
            button_styles JSON COMMENT 'Button border-radius, shadows, etc.',
            is_active BOOLEAN DEFAULT FALSE,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Themes - Color and style settings'`,

        // 4. CMS Assets Table (Images, Files)
        `CREATE TABLE IF NOT EXISTS cms_assets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            original_filename VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_type VARCHAR(50) NOT NULL,
            file_size INT NOT NULL COMMENT 'Size in bytes',
            alt_text VARCHAR(255),
            uploaded_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_type (file_type),
            INDEX idx_uploaded (uploaded_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Assets - Uploaded images and files'`,

        // 5. CMS Versions Table (Rollback Support)
        `CREATE TABLE IF NOT EXISTS cms_versions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            page_id INT NOT NULL,
            version_number INT NOT NULL,
            content_snapshot JSON NOT NULL COMMENT 'Complete page + sections snapshot',
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_page_version (page_id, version_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Versions - Rollback history'`,

        // 6. CMS Menu Items Table
        `CREATE TABLE IF NOT EXISTS cms_menu_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            menu_location ENUM('header', 'footer') NOT NULL,
            label VARCHAR(100) NOT NULL,
            url VARCHAR(255) NOT NULL,
            target VARCHAR(20) DEFAULT '_self',
            display_order INT DEFAULT 0,
            enabled BOOLEAN DEFAULT TRUE,
            parent_id INT DEFAULT NULL COMMENT 'For dropdown menus',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES cms_menu_items(id) ON DELETE CASCADE,
            INDEX idx_location_order (menu_location, display_order),
            UNIQUE INDEX unique_menu_item (menu_location, label, url)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Menu Items - Dynamic navigation'`,

        // 7. CMS Settings Table (Global Site Settings)
        `CREATE TABLE IF NOT EXISTS cms_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT NOT NULL,
            setting_type VARCHAR(50) DEFAULT 'text' COMMENT 'text, json, boolean, number',
            description TEXT,
            updated_by INT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_key (setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CMS Settings - Global configuration'`,

        // 8. Enhanced Audit Logs for CMS Actions
        `ALTER TABLE audit_logs 
         ADD COLUMN IF NOT EXISTS action_details JSON COMMENT 'Additional context for CMS actions'`,

        // 9. Add SUPER_ADMIN role support
        `ALTER TABLE users 
         MODIFY COLUMN role ENUM('admin', 'teacher', 'student', 'parent', 'super_admin') NOT NULL`,

        // 10. QR Sessions Table (for MFA)
        `CREATE TABLE IF NOT EXISTS qr_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token VARCHAR(64) NOT NULL UNIQUE,
            user_id INT DEFAULT NULL,
            status ENUM('pending', 'authorized', 'expired') DEFAULT 'pending',
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            INDEX idx_token (token),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='QR Code authentication sessions'`
    ];

    let completed = 0;
    const total = migrations.length;

    migrations.forEach((query, index) => {
        db.query(query, (err) => {
            completed++;
            if (err) {
                console.error(`❌ Migration ${index + 1} failed:`, err.message);
            } else {
                console.log(`✅ Migration ${index + 1}/${total} completed`);
            }

            if (completed === total) {
                insertDefaultData();
            }
        });
    });
}

function insertDefaultData() {
    console.log('\n📦 Inserting default CMS data...');

    const defaultData = [
        // 1. Create default theme (Dark Blue + White)
        `INSERT INTO cms_themes (theme_name, colors, fonts, button_styles, is_active, created_by) VALUES (
            'Dark Blue Professional',
            '{"primary": "#1e3a8a", "secondary": "#3b82f6", "accent": "#60a5fa", "background": "#ffffff", "text": "#1f2937", "textLight": "#6b7280"}',
            '{"heading": "Inter, sans-serif", "body": "Roboto, sans-serif", "headingWeight": "700", "bodyWeight": "400"}',
            '{"borderRadius": "8px", "shadow": "0 4px 6px rgba(0,0,0,0.1)", "hoverShadow": "0 10px 15px rgba(0,0,0,0.2)"}',
            TRUE,
            1
        ) ON DUPLICATE KEY UPDATE theme_name = theme_name`,

        // 2. Create default pages (migrating existing static pages)
        `INSERT INTO cms_pages (slug, title, meta_description, status, is_homepage, created_by) VALUES
            ('home', 'Home - Waqar Public Higher Secondary School', 'Welcome to Waqar Public Higher Secondary School - Excellence in Education', 'published', TRUE, 1),
            ('about', 'About Us', 'Learn about our mission, vision, and values', 'published', FALSE, 1),
            ('admissions', 'Admissions', 'Join our school - Admission process and requirements', 'published', FALSE, 1),
            ('fee-structure', 'Fee Structure', 'Transparent fee structure for all classes', 'published', FALSE, 1),
            ('gallery', 'Gallery', 'Explore our campus and activities', 'published', FALSE, 1),
            ('contact', 'Contact Us', 'Get in touch with us', 'published', FALSE, 1)
        ON DUPLICATE KEY UPDATE slug = slug`,

        // 3. Create default menu items
        `INSERT INTO cms_menu_items (menu_location, label, url, display_order, enabled) VALUES
            ('header', 'Home', '/', 1, TRUE),
            ('header', 'About', '/about', 2, TRUE),
            ('header', 'Admissions', '/admissions', 3, TRUE),
            ('header', 'Fee Structure', '/fee-structure', 4, TRUE),
            ('header', 'Gallery', '/gallery', 5, TRUE),
            ('header', 'Contact', '/contact', 6, TRUE),
            ('header', 'Portal', '/login', 7, TRUE)
        ON DUPLICATE KEY UPDATE label = label`,

        // 4. Create global settings
        `INSERT INTO cms_settings (setting_key, setting_value, setting_type, description) VALUES
            ('site_name', 'Waqar Public Higher Secondary School', 'text', 'School name displayed across the site'),
            ('site_logo', '/images/waqar.png', 'text', 'Path to school logo'),
            ('contact_email', 'info@waqar.edu.pk', 'text', 'Primary contact email'),
            ('contact_phone', '+92 123 4567890', 'text', 'Primary contact phone'),
            ('address', 'Main Road, Khairpur Mirs', 'text', 'School physical address'),
            ('social_media', '{"facebook": "", "twitter": "", "instagram": "", "youtube": ""}', 'json', 'Social media links'),
            ('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode')
        ON DUPLICATE KEY UPDATE setting_key = setting_key`
    ];

    let dataCompleted = 0;
    const dataTotal = defaultData.length;

    defaultData.forEach((query, index) => {
        db.query(query, (err) => {
            dataCompleted++;
            if (err) {
                console.error(`❌ Default data ${index + 1} failed:`, err.message);
            } else {
                console.log(`✅ Default data ${index + 1}/${dataTotal} inserted`);
            }

            if (dataCompleted === dataTotal) {
                createSuperAdmin();
            }
        });
    });
}

function createSuperAdmin() {
    console.log('\n👑 Creating Super Admin user...');

    const bcrypt = require('bcryptjs');
    const password = 'SuperAdmin@2026'; // Change this!
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Ensure super_admin role enum exists before inserting (handled in migration 9)
    const query = `INSERT INTO users (username, password, role, full_name, email, campus_id) 
                   VALUES ('superadmin', ?, 'super_admin', 'Super Administrator', 'superadmin@waqar.edu.pk', 1)
                   ON DUPLICATE KEY UPDATE role = 'super_admin'`;

    db.query(query, [hashedPassword], (err) => {
        if (err) {
            console.error('❌ Super Admin creation failed:', err.message);
        } else {
            console.log('✅ Super Admin created successfully');
            console.log('\n🔐 SUPER ADMIN CREDENTIALS:');
            console.log('   Username: superadmin');
            console.log('   Password: SuperAdmin@2026');
        }

        finalizeMigration();
    });
}

function finalizeMigration() {
    console.log('\n🎉 CMS Migration completed successfully!');
    db.end();
    process.exit(0);
}
