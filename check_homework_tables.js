const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

db.connect(err => {
    if (err) { console.error('Connection failed:', err); process.exit(1); }
    console.log('Connected to DB');

    db.query('SHOW TABLES', (err, results) => {
        if (err) { console.error(err); db.end(); return; }
        console.log('Tables:', results.map(r => Object.values(r)[0]));

        db.query('DESCRIBE homework', (err2, hCols) => {
            if (err2) { console.log('Homework table error:', err2.message); }
            else { console.log('Homework columns:', hCols.map(c => c.Field)); }

            db.query('DESCRIBE homework_submissions', (err3, sCols) => {
                if (err3) { console.log('Submissions table error:', err3.message); }
                else { console.log('Submissions columns:', sCols.map(c => c.Field)); }
                db.end();
            });
        });
    });
});
