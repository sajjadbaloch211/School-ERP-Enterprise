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
    console.log('✅ Connected to database');

    const query = "UPDATE users SET role = 'super_admin' WHERE role = 'admin'";
    db.query(query, (err, result) => {
        if (err) throw err;
        console.log(`✅ ${result.affectedRows} admin users promoted to Super Admin!`);
        db.end();
    });
});
