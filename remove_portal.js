const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_db'
});

db.query('DELETE FROM cms_menu_items WHERE label = "Portal" AND menu_location = "header"', (err, result) => {
    if (err) console.error(err);
    else console.log("Removed", result.affectedRows, "Portal items");
    db.end();
});
