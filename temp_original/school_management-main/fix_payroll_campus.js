const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

console.log('🔧 Adding campus_id column to payroll table...');

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1);
    }

    console.log('✓ Connected to database');

    // Add campus_id column if it doesn't exist
    const addColumnQuery = `
        ALTER TABLE payroll 
        ADD COLUMN IF NOT EXISTS campus_id INT DEFAULT 1
    `;

    db.query(addColumnQuery, (err) => {
        if (err && err.code !== 'ER_DUP_FIELDNAME') {
            console.error('❌ Error adding column:', err.message);
            db.end();
            process.exit(1);
        }

        console.log('✓ campus_id column added successfully');

        // Add foreign key constraint
        const addFKQuery = `
            ALTER TABLE payroll 
            ADD CONSTRAINT fk_payroll_campus 
            FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
        `;

        db.query(addFKQuery, (err) => {
            if (err && err.code !== 'ER_DUP_KEYNAME') {
                console.log('⚠ Foreign key constraint note:', err.message);
            } else {
                console.log('✓ Foreign key constraint added');
            }

            console.log('\n✅ Payroll table migration completed successfully!');
            db.end();
            process.exit(0);
        });
    });
});
