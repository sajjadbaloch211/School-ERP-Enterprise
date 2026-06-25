const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(async err => {
    if (err) {
        console.error('Connection failed:', err);
        return;
    }

    console.log('Connected to database to reset admin password...');

    const username = 'admin';
    const rawPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Let's also reset lockout fields, just in case
    const sql = `UPDATE users SET password = ?, login_attempts = 0, lockout_until = NULL WHERE username = ?`;
    db.execute(sql, [hashedPassword, username], (err2, result) => {
        if (err2) {
            console.error('Update failed:', err2);
        } else {
            console.log('✅ Admin password updated successfully!');
            console.log('Affected rows:', result.affectedRows);
        }
        db.end();
    });
});
