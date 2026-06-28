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

const username = '12345'; // Teacher username
const newPassword = '12345123'; // username + '123'

db.connect(async err => {
    if (err) { console.error(err); return; }

    console.log('Resetting password for teacher:', username);
    console.log('New password will be:', newPassword);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.execute('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username], (err, result) => {
        if (err) {
            console.error('Error:', err);
        } else {
            console.log('✅ Password reset successful!');
            console.log('Affected rows:', result.affectedRows);
            console.log('\nNow try logging in with:');
            console.log('Campus Code: MAIN');
            console.log('Username:', username);
            console.log('Password:', newPassword);
        }
        db.end();
    });
});
