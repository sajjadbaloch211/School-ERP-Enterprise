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

    // Check students
    db.query('SELECT u.id, u.username, u.role, u.campus_id, s.campus_id as student_campus_id FROM users u LEFT JOIN students s ON u.id = s.user_id WHERE u.role = "student" LIMIT 5', (err, students) => {
        if (err) console.error("Students Error:", err);
        else {
            console.log('\n=== STUDENTS ===');
            console.log(students);
        }

        // Check teachers
        db.query('SELECT u.id, u.username, u.role, u.campus_id, t.campus_id as teacher_campus_id FROM users u LEFT JOIN teachers t ON u.id = t.user_id WHERE u.role = "teacher" LIMIT 5', (err2, teachers) => {
            if (err2) console.error("Teachers Error:", err2);
            else {
                console.log('\n=== TEACHERS ===');
                console.log(teachers);
            }
            db.end();
        });
    });
});
