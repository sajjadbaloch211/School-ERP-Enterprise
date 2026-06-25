const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

db.query('DESCRIBE cms_themes', (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
    process.exit();
});
