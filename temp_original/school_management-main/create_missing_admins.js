const mysql = require('mysql2');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) { console.error(err); return; }

    // Find campuses that are NOT MAIN
    db.query("SELECT id, campus_code, campus_name FROM campuses WHERE campus_code != 'MAIN'", (err, campuses) => {
        if (err) { console.error(err); return; }

        console.log(`Checking ${campuses.length} campuses for missing admins...`);

        let pending = campuses.length;
        if (pending === 0) {
            console.log("No extra campuses found.");
            db.end();
            return;
        }

        campuses.forEach(async c => {
            const pass = await bcrypt.hash('admin123', 10);

            // Try to insert 'admin' for this campus
            // Since we dropped the global unique index, this should work if (admin, campus_id) doesn't exist.
            const sql = "INSERT IGNORE INTO users (username, password, role, full_name, campus_id, email) VALUES ('admin', ?, 'admin', ?, ?, ?)";
            const params = [pass, 'Admin - ' + c.campus_name, c.id, 'admin@' + c.campus_code.toLowerCase() + '.com'];

            db.execute(sql, params, (err2, res) => {
                if (err2) console.log(`Error for ${c.campus_name}: ${err2.message}`);
                else if (res.affectedRows > 0) console.log(`Created admin for ${c.campus_name}`);
                else console.log(`Admin already exists for ${c.campus_name}`);

                pending--;
                if (pending === 0) {
                    console.log("Backfill Complete.");
                    db.end();
                }
            });
        });
    });
});
