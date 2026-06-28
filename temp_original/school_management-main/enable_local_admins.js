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
    console.log("Connected. Modification started...");

    // Drop the global unique index on username
    db.query('DROP INDEX users_username_key ON users', (err) => {
        if (err) {
            console.log("Note (Drop Index):", err.message);
        } else {
            console.log("Success: Dropped global unique constraint on username.");
        }

        // Ensure composite index exists (it showed in schema, but just in case)
        db.query('ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS unique_user_campus (username, campus_id)', (err2) => {
            if (err2 && err2.code !== 'ER_DUP_KEYNAME') console.log("Note (Add Index):", err2.message);

            console.log("Schema Update Complete.");
            db.end();
        });
    });
});
