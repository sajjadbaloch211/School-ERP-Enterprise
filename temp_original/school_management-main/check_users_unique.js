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
    db.query('SHOW CREATE TABLE users', (err, res) => {
        if (err) console.error(err);
        else console.log(res[0]['Create Table']);
        db.end();
    });
});
