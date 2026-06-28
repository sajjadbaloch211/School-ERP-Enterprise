const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

db.connect((err) => {
    if (err) throw err;
    db.query('SELECT id, username, email, role, full_name FROM users WHERE id = 5', (err, results) => {
        if (err) console.error(err);
        if (results.length > 0) {
            console.log(JSON.stringify(results[0], null, 2));
        } else {
            console.log("User 5 not found");
        }
        db.end();
    });
});
