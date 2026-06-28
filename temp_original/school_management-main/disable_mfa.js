const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'waqar_school_db'
});

db.query("UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE username = 'admin'", (err, results) => {
    if (err) {
        console.error("Error disabling MFA:", err);
    } else {
        console.log("MFA disabled for 'admin' user successfully.");
    }
    process.exit();
});
