const mysql = require('mysql2');
const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'waqar_school_db'
});

db.connect();

const tableName = 'users';

db.query(`SHOW INDEX FROM ${tableName}`, (err, results) => {
    if (err) {
        console.error(err);
        db.end();
        return;
    }

    const emailIndex = results.find(idx => idx.Column_name === 'email' && idx.Non_unique === 0);

    if (emailIndex) {
        const indexName = emailIndex.Key_name;
        console.log(`Found UNIQUE index on email: ${indexName}. Dropping it...`);
        db.query(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`, (dropErr) => {
            if (dropErr) console.error("Error dropping index:", dropErr);
            else console.log("Index dropped successfully.");
            db.end();
        });
    } else {
        console.log("No UNIQUE index found on email column.");
        db.end();
    }
});
