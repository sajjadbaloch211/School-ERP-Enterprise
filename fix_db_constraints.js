const mysql = require('mysql2');
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'waqar_school_db'
});

db.connect();

const dropIndex = (table, column) => {
    return new Promise((resolve) => {
        db.query(`SHOW INDEX FROM ${table}`, (err, results) => {
            if (err) { resolve(); return; }
            const idx = results.find(i => i.Column_name === column && i.Non_unique === 0 && i.Key_name !== 'PRIMARY');
            if (idx) {
                console.log(`Dropping UNIQUE index '${idx.Key_name}' on ${table}.${column}...`);
                db.query(`ALTER TABLE ${table} DROP INDEX ${idx.Key_name}`, (e) => {
                    if (e) console.log("Error dropping:", e.message);
                    else console.log("Dropped.");
                    resolve();
                });
            } else {
                console.log(`No UNIQUE index on ${table}.${column}. Good.`);
                resolve();
            }
        });
    });
};

(async () => {
    console.log("Cleaning constraints for Real-World School Rules...");

    // USERS Table Rules
    // username: MUST BE UNIQUE (Keep it)
    // email: ALLOW DUPLICATES
    // full_name: ALLOW DUPLICATES
    await dropIndex('users', 'email');
    await dropIndex('users', 'full_name');

    // STUDENTS Table Rules
    // email: ALLOW DUPLICATES
    // phone: ALLOW DUPLICATES
    // roll_no: ALLOW DUPLICATES (User said "duplicate ho sakta hai across different classes")
    await dropIndex('students', 'email'); // if exists
    await dropIndex('students', 'phone');
    await dropIndex('students', 'full_name');

    console.log("Database constraints verified.");
    db.end();
})();
