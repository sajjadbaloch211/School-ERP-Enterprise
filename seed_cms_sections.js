require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedAll() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'school_management'
    });
    console.log('✅ Connected to database');

    // Clear old sections completely
    await db.query('DELETE FROM cms_sections');
    console.log('🗑️ Cleared all old sections');

    const sections = [
        // ==========================================
        // 🏠 PAGE 1: HOME PAGE
        // ==========================================
        {
            page_id: 1,
            section_type: 'hero',
            section_name: 'Main Hero Banner',
            display_order: 1,
            content: {
                headline: 'Empowering Future Leaders',
                subheadline: 'Sajjad School Management System — A modern digital campus where excellence in academics meets cutting-edge school management. Track attendance, results, fees, and more — all in one place.',
                primary_cta_text: 'Student & Staff Portal',
                primary_cta_link: '/login',
                secondary_cta_text: 'Apply for Admission',
                secondary_cta_link: '/admissions',
                image_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80'
            }
        },
        {
            page_id: 1,
            section_type: 'stats',
            section_name: 'School Stats',
            display_order: 2,
            content: {
                items: [
                    { number: '2,500+', label: 'Enrolled Students' },
                    { number: '180+', label: 'Expert Teachers' },
                    { number: '98%', label: 'Board Pass Rate' },
                    { number: '25+', label: 'Years of Excellence' }
                ]
            }
        },
        {
            page_id: 1,
            section_type: 'features',
            section_name: 'School Management Features',
            display_order: 3,
            content: {
                title: 'Complete Digital School Management',
                subtitle: 'Everything your school needs — from student enrollment to fee collection, attendance tracking to result cards — managed digitally in real time.',
                items: [
                    {
                        title: 'Smart Attendance System',
                        description: 'Daily attendance tracking for every student and teacher. Automated reports sent to parents via the parent portal.',
                        icon: 'fas fa-user-check'
                    },
                    {
                        title: 'Online Fee Management',
                        description: 'Generate fee vouchers, collect payments, and track dues digitally. Parents can pay and download receipts online.',
                        icon: 'fas fa-file-invoice-dollar'
                    },
                    {
                        title: 'Result & Grade Cards',
                        description: 'Automated result processing with grade calculation. Students and parents can download result cards from their portal.',
                        icon: 'fas fa-chart-line'
                    },
                    {
                        title: 'Multi-Campus Management',
                        description: 'Manage multiple school branches from one central admin dashboard with campus-wise reports and controls.',
                        icon: 'fas fa-school'
                    },
                    {
                        title: 'Parent Communication Portal',
                        description: 'Parents stay informed with real-time access to attendance, results, homework, and fee status through their dedicated portal.',
                        icon: 'fas fa-comments'
                    },
                    {
                        title: 'Homework & Timetable',
                        description: 'Teachers assign homework digitally. Class timetables are published online so students always know what\'s next.',
                        icon: 'fas fa-calendar-check'
                    }
                ]
            }
        },
        {
            page_id: 1,
            section_type: 'text',
            section_name: 'About School',
            display_order: 4,
            content: {
                title: 'A Legacy of Academic Excellence',
                image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900&q=80',
                body: `<p>Established with a vision to transform education in our region, our school has grown into a fully digital, modern institution that combines traditional values with technology-driven learning.</p>
                       <p>Our state-of-the-art School Management System connects <strong>students, parents, teachers, and administrators</strong> on one unified platform — making every process from admissions to graduation seamless and transparent.</p>
                       <ul style="list-style:none; display:flex; flex-direction:column; gap:8px; margin-top:16px;">
                         <li>✅ Fully digitized student records and academic history</li>
                         <li>✅ Real-time attendance with parent notifications</li>
                         <li>✅ Automated fee voucher and payment system</li>
                         <li>✅ Online result cards and grade reports</li>
                         <li>✅ Multi-campus centralized control</li>
                       </ul>`
            }
        },
        {
            page_id: 1,
            section_type: 'gallery',
            section_name: 'Campus Gallery',
            display_order: 5,
            content: {
                title: 'Life at Our School',
                images: [
                    { url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80', caption: 'Students in class' },
                    { url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80', caption: 'Library' },
                    { url: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&q=80', caption: 'Science Lab' },
                    { url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80', caption: 'Sports' },
                    { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80', caption: 'Graduation' },
                    { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80', caption: 'Campus' }
                ]
            }
        },

        // ==========================================
        // 📖 PAGE 2: ABOUT US PAGE
        // ==========================================
        {
            page_id: 2,
            section_type: 'hero',
            section_name: 'About Hero Banner',
            display_order: 1,
            content: {
                headline: 'Our History & Mission',
                subheadline: 'Learn about the legacy, values, and vision that drive our digital campus forwards.',
                primary_cta_text: 'Admissions Procedure',
                primary_cta_link: '/admissions',
                secondary_cta_text: 'Contact Us',
                secondary_cta_link: '/contact',
                image_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80'
            }
        },
        {
            page_id: 2,
            section_type: 'text',
            section_name: 'About Vision',
            display_order: 2,
            content: {
                title: 'Vision and Mission Statement',
                image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=900&q=80',
                body: `<h3>Our Vision</h3>
                       <p>To be a leading center of educational excellence, fostering dynamic learning, digital fluency, and robust moral values to prepare students for local and global challenges.</p>
                       <br>
                       <h3>Our Mission</h3>
                       <p>We commit to offering state-of-the-art academic training and character development by leveraging digital management systems, expert faculty, and modern learning amenities.</p>`
            }
        },

        // ==========================================
        // 📥 PAGE 3: ADMISSIONS PAGE
        // ==========================================
        {
            page_id: 3,
            section_type: 'hero',
            section_name: 'Admissions Hero Banner',
            display_order: 1,
            content: {
                headline: 'Join Our Digital Campus',
                subheadline: 'Transparent admissions procedure, requirements, and information for the next academic year.',
                primary_cta_text: 'Admissions Query',
                primary_cta_link: '/contact',
                secondary_cta_text: 'Fee Structure',
                secondary_cta_link: '/fee-structure',
                image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80'
            }
        },
        {
            page_id: 3,
            section_type: 'text',
            section_name: 'Admissions Requirements',
            display_order: 2,
            content: {
                title: 'Admission Steps & Requirements',
                image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=80',
                body: `<h3>Simple 3-Step Process</h3>
                       <ol style="margin-left: 20px; margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                         <li><strong>1. File Admissions Form:</strong> Visit the campus office to obtain the application pack or send an inquiry via our contact form.</li>
                         <li><strong>2. Documents Review & Interview:</strong> Provide previous academic records, birth certificate, and parent's CNIC. Short interview/test scheduled.</li>
                         <li><strong>3. Fee Payment & Portal Setup:</strong> Once approved, pay the admission fee and get instant credentials for your child's student portal.</li>
                       </ol>`
            }
        },

        // ==========================================
        // 💵 PAGE 4: FEE STRUCTURE PAGE
        // ==========================================
        {
            page_id: 4,
            section_type: 'hero',
            section_name: 'Fee Hero Banner',
            display_order: 1,
            content: {
                headline: 'Transparent Fee Structure',
                subheadline: 'No hidden charges. Clear breakdown of tuition and other fees across all classes.',
                primary_cta_text: 'Admissions Details',
                primary_cta_link: '/admissions',
                secondary_cta_text: 'Contact Registrar',
                secondary_cta_link: '/contact',
                image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80'
            }
        },
        {
            page_id: 4,
            section_type: 'text',
            section_name: 'Fee Grid Detail',
            display_order: 2,
            content: {
                title: 'Detailed Class Fee Breakdown',
                image_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900&q=80',
                body: `<p>We strive to offer premium digital-backed education at affordable rates. Here is a baseline guide to current monthly tuition fees:</p>
                       <br>
                       <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                         <thead>
                           <tr style="background: var(--P); color: white;">
                             <th style="padding: 10px; border: 1px solid rgba(255,255,255,0.1); text-align: left;">Program level</th>
                             <th style="padding: 10px; border: 1px solid rgba(255,255,255,0.1); text-align: left;">Monthly Tuition</th>
                             <th style="padding: 10px; border: 1px solid rgba(255,255,255,0.1); text-align: left;">Lab Fee (monthly)</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr style="background: #f8fafc;">
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">Primary (Class 1-5)</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 2,500</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">-</td>
                           </tr>
                           <tr>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">Middle (Class 6-8)</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 3,500</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 300</td>
                           </tr>
                           <tr style="background: #f8fafc;">
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">Matric (Class 9-10)</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 4,500</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 500</td>
                           </tr>
                           <tr>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">Inter (Class 11-12)</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 6,000</td>
                             <td style="padding: 10px; border: 1px solid #e2e8f0;">PKR 800</td>
                           </tr>
                         </tbody>
                       </table>`
            }
        },

        // ==========================================
        // 🖼️ PAGE 5: GALLERY PAGE
        // ==========================================
        {
            page_id: 5,
            section_type: 'hero',
            section_name: 'Gallery Hero Banner',
            display_order: 1,
            content: {
                headline: 'Explore Our Campus',
                subheadline: 'A dynamic photographic visual tour of classrooms, labs, events, and sports activities.',
                primary_cta_text: 'Admissions Info',
                primary_cta_link: '/admissions',
                secondary_cta_text: 'Get in Touch',
                secondary_cta_link: '/contact',
                image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80'
            }
        },
        {
            page_id: 5,
            section_type: 'gallery',
            section_name: 'Main Campus Grid',
            display_order: 2,
            content: {
                title: 'Campus Activities & Environment',
                images: [
                    { url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&q=80', caption: 'State of the art classrooms' },
                    { url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80', caption: 'Modern research library' },
                    { url: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=600&q=80', caption: 'Fully equipped Science Lab' },
                    { url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80', caption: 'Annual sports day activities' },
                    { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&q=80', caption: 'Graduation convocation' },
                    { url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80', caption: 'Campus learning environments' }
                ]
            }
        },

        // ==========================================
        // 📞 PAGE 6: CONTACT PAGE
        // ==========================================
        {
            page_id: 6,
            section_type: 'hero',
            section_name: 'Contact Hero Banner',
            display_order: 1,
            content: {
                headline: 'Get in Touch With Us',
                subheadline: 'We are here to answer your queries about admissions, portals, or campus procedures.',
                primary_cta_text: 'Admissions Info',
                primary_cta_link: '/admissions',
                secondary_cta_text: 'School Fees',
                secondary_cta_link: '/fee-structure',
                image_url: 'https://images.unsplash.com/photo-1523966211575-eb4a01e7dd51?w=1200&q=80'
            }
        },
        {
            page_id: 6,
            section_type: 'text',
            section_name: 'Contact Details',
            display_order: 2,
            content: {
                title: 'Campus Contacts & Location',
                image_url: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?w=900&q=80',
                body: `<p>Feel free to visit our campus or send us an email. Our registrar team will reach out to you within 24 hours.</p>
                       <br>
                       <h3>General Contacts</h3>
                       <p>📞 Phone: <strong>+92 300 1234567</strong></p>
                       <p>✉️ Email: <strong>info@sajjad.edu.pk</strong></p>
                       <p>📍 Location: <strong>Main Road, Khairpur Mirs, Sindh, Pakistan</strong></p>
                       <br>
                       <h3>Office Timings</h3>
                       <p>Monday – Saturday: <strong>08:00 AM – 02:00 PM</strong></p>
                       <p>Sunday: <strong>Closed</strong></p>`
            }
        }
    ];

    for (const sec of sections) {
        await db.query(
            'INSERT INTO cms_sections (page_id, section_type, section_name, content, display_order, enabled) VALUES (?, ?, ?, ?, ?, 1)',
            [sec.page_id, sec.section_type, sec.section_name, JSON.stringify(sec.content), sec.display_order]
        );
        console.log(`✅ Inserted: ${sec.section_name} for page_id: ${sec.page_id}`);
    }

    // Update settings
    const settingsUpdates = [
        ['site_name', 'Sajjad School Management System'],
        ['school_name', 'Sajjad School Management System'],
        ['school_tagline', 'Digital Excellence in Education'],
        ['contact_phone', '+92 300 1234567'],
        ['contact_email', 'info@sajjad.edu.pk'],
        ['address', 'Main Road, Khairpur Mirs, Sindh, Pakistan'],
        ['established', '1999'],
    ];
    for (const [k, v] of settingsUpdates) {
        await db.query(
            'INSERT INTO cms_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            [k, v, v]
        );
    }
    console.log('✅ Settings updated');

    // Ensure header menus exist
    await db.query('DELETE FROM cms_menu_items WHERE menu_location = ?', ['header']);
    const headerLinks = [
        ['Home', '/', 1],
        ['About', '/about', 2],
        ['Admissions', '/admissions', 3],
        ['Fee Structure', '/fee-structure', 4],
        ['Gallery', '/gallery', 5],
        ['Contact', '/contact', 6],
    ];
    for (const [label, url, order] of headerLinks) {
        await db.query(
            'INSERT INTO cms_menu_items (menu_location, label, url, display_order, enabled) VALUES (?, ?, ?, ?, 1)',
            ['header', label, url, order]
        );
    }
    console.log('✅ Header menu seeded');

    // Footer menus
    await db.query('DELETE FROM cms_menu_items WHERE menu_location = ?', ['footer']);
    const footerLinks = [
        ['Home', '/'], ['About Us', '/about'], ['Admissions', '/admissions'],
        ['Fee Structure', '/fee-structure'], ['Gallery', '/gallery'], ['Contact Us', '/contact']
    ];
    for (const [label, url] of footerLinks) {
        await db.query(
            'INSERT INTO cms_menu_items (menu_location, label, url, display_order, enabled) VALUES (?, ?, ?, 0, 1)',
            ['footer', label, url]
        );
    }
    console.log('✅ Footer menu seeded');

    await db.end();
    console.log('\n🎉 All data seeded successfully!');
    process.exit(0);
}

seedAll().catch(e => { console.error('❌', e); process.exit(1); });
