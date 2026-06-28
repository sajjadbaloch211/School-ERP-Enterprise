const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }

    console.log('Connected to database\n');
    console.log('=== AVAILABLE CLASSES ===\n');

    db.query('SELECT id, class_name, section, campus_id FROM classes ORDER BY id', (err, classes) => {
        if (err) {
            console.error('Error fetching classes:', err);
            process.exit(1);
        }

        if (classes.length === 0) {
            console.log('❌ No classes found in database!');
            console.log('\nYou need to create classes first:');
            console.log('1. Go to http://localhost:3000/admin/classes');
            console.log('2. Add at least one class');
            console.log('3. Then try importing students again\n');
        } else {
            console.log('ID | Class Name | Section | Campus ID');
            console.log('---|------------|---------|----------');
            classes.forEach(c => {
                console.log(`${c.id}  | ${c.class_name.padEnd(10)} | ${c.section.padEnd(7)} | ${c.campus_id}`);
            });

            console.log('\n✅ Use these class IDs in your CSV file!');
            console.log(`\nExample: If you want to add students to class "${classes[0].class_name}", use class_id = ${classes[0].id}\n`);
        }

        db.end();
    });
});
