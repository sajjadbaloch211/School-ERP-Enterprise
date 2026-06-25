const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) { console.error(err); return; }

    db.query('DESCRIBE notices', (err, res) => {
        if (err) console.error("Notices Error:", err);
        else console.log('Notices Columns:', res.map(c => c.Field));

        db.query('DESCRIBE audit_logs', (err2, res2) => {
            if (err2) console.error("Audit Logs Error:", err2);
            else console.log('Audit Logs Columns:', res2.map(c => c.Field));
            db.end();
        });
    });
});
