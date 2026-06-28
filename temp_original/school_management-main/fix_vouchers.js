const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
});

db.connect(err => {
    if (err) { console.error(err); return; }
    console.log('Connected. Fixing Vouchers Schema...');

    // 1. Add Column
    db.query("ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS campus_id INT DEFAULT 1", (err) => {
        if (err) console.log("Column might exist:", err.message);

        // 2. Populate Column from Students
        const updateQuery = `
            UPDATE vouchers v
            JOIN students s ON v.student_id = s.id
            SET v.campus_id = s.campus_id
            WHERE v.campus_id = 1 OR v.campus_id IS NULL
        `;

        db.query(updateQuery, (err2, res) => {
            if (err2) console.error("Update Failed:", err2);
            else console.log(`Updated ${res.changedRows} vouchers with correct campus_id.`);
            db.end();
        });
    });
});
