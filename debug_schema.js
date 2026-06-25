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
    if (err) {
        console.error('Connect Error:', err);
        return;
    }
    console.log('Connected to DB');

    db.query('DESCRIBE vouchers', (err, res) => {
        if (err) console.error(err);
        else console.log('Vouchers Columns:', res.map(c => c.Field));

        db.query('DESCRIBE students', (err2, res2) => {
            if (err2) console.error(err2);
            else console.log('Students Columns:', res2.map(c => c.Field));

            db.query('DESCRIBE teachers', (err3, res3) => {
                if (err3) console.error(err3);
                else console.log('Teachers Columns:', res3.map(c => c.Field));
                db.end();
            });
        });
    });
});
