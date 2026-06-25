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

// Test credentials
const testUsername = 'admin'; // Change this to the teacher's username
const testPassword = 'admin123'; // username + '123'
const testCampusCode = 'MAIN';

db.connect(async err => {
    if (err) { console.error(err); return; }

    console.log('\n=== TESTING LOGIN ===');
    console.log('Username:', testUsername);
    console.log('Password:', testPassword);
    console.log('Campus Code:', testCampusCode);

    // Step 1: Find campus
    db.query('SELECT * FROM campuses WHERE campus_code = ?', [testCampusCode], (err, campuses) => {
        if (err || campuses.length === 0) {
            console.log('\n❌ Campus not found!');
            db.end();
            return;
        }

        const campus = campuses[0];
        console.log('\n✅ Campus found:', campus.campus_name, '(ID:', campus.id + ')');

        // Step 2: Find user in that campus
        db.query('SELECT * FROM users WHERE username = ? AND campus_id = ?', [testUsername, campus.id], async (err2, users) => {
            if (err2 || users.length === 0) {
                console.log('\n❌ User not found in this campus!');

                // Check if user exists in ANY campus
                db.query('SELECT * FROM users WHERE username = ?', [testUsername], (err3, allUsers) => {
                    if (allUsers && allUsers.length > 0) {
                        console.log('\n⚠️  User exists but in different campus:');
                        console.log('   User campus_id:', allUsers[0].campus_id);
                        console.log('   Login campus_id:', campus.id);
                    }
                    db.end();
                });
                return;
            }

            const user = users[0];
            console.log('\n✅ User found:', user.full_name, '(Role:', user.role + ')');

            // Step 3: Verify password
            const match = await bcrypt.compare(testPassword, user.password);
            if (match) {
                console.log('\n✅ Password matches! Login should work.');
            } else {
                console.log('\n❌ Password does NOT match!');
                console.log('   Stored hash:', user.password.substring(0, 20) + '...');
            }

            db.end();
        });
    });
});
