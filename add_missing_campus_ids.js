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
    if (err) { console.error("DB Connect Error:", err); return; }
    console.log('Connected. Identifying missing schemas...');

    const queries = [
        // 1. Add campus_id to FEES
        "ALTER TABLE fees ADD COLUMN IF NOT EXISTS campus_id INT DEFAULT 1",

        // 2. Add campus_id to FEE_PAYMENTS
        "ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS campus_id INT DEFAULT 1"
    ];

    let completed = 0;
    queries.forEach(q => {
        db.query(q, (err) => {
            if (err && err.code !== 'ER_DUP_FIELDNAME') console.error("Alter Error:", err.message);
            completed++;
            if (completed === queries.length) runBackfill();
        });
    });

    function runBackfill() {
        console.log("Schema Updated. Running Data Backfill...");

        // 3. Backfill FEES
        const qFees = `
            UPDATE fees f
            JOIN students s ON f.student_id = s.id
            SET f.campus_id = s.campus_id
            WHERE f.campus_id = 1 OR f.campus_id IS NULL
        `;

        db.query(qFees, (err, res) => {
            if (err) console.error("Fee Backfill Error:", err);
            else console.log(`Backfilled ${res.changedRows} fee records.`);

            // 4. Backfill PAYMENTS
            // Link payments to vouchers to find campus (vouchers have campus_id now)
            const qPay = `
                UPDATE fee_payments fp
                JOIN vouchers v ON fp.voucher_id = v.id
                SET fp.campus_id = v.campus_id
                WHERE fp.campus_id = 1 OR fp.campus_id IS NULL
            `;

            db.query(qPay, (err2, res2) => {
                if (err2) console.error("Payment Backfill Error:", err2);
                else console.log(`Backfilled ${res2.changedRows} payment records.`);

                console.log("Migration Complete.");
                db.end();
            });
        });
    }
});
