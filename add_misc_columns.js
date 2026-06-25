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
    console.log('Connected. Identifying missing schemas for Notices and Audit Logs...');

    const queries = [
        // 1. Add campus_id to NOTICES
        "ALTER TABLE notices ADD COLUMN IF NOT EXISTS campus_id INT DEFAULT 1",

        // 2. Add campus_id to AUDIT_LOGS
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS campus_id INT DEFAULT 1"
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

        // 3. Backfill NOTICES (via posted_by -> users.id -> campus_id)
        const qNotices = `
            UPDATE notices n
            JOIN users u ON n.posted_by = u.id
            SET n.campus_id = u.campus_id
            WHERE n.campus_id = 1 OR n.campus_id IS NULL
        `;

        db.query(qNotices, (err, res) => {
            if (err) console.error("Notices Backfill Error:", err);
            else console.log(`Backfilled ${res.changedRows} notices.`);

            // 4. Backfill AUDIT LOGS (via user_id -> users.id -> campus_id)
            const qAudit = `
                UPDATE audit_logs a
                JOIN users u ON a.user_id = u.id
                SET a.campus_id = u.campus_id
                WHERE a.campus_id = 1 OR a.campus_id IS NULL
            `;

            db.query(qAudit, (err2, res2) => {
                if (err2) console.error("Audit Logs Backfill Error:", err2);
                else console.log(`Backfilled ${res2.changedRows} audit logs.`);

                console.log("Misc Migration Complete.");
                db.end();
            });
        });
    }
});
