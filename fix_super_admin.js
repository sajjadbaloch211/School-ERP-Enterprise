const fs = require('fs');
const path = 'server.js';
let content = fs.readFileSync(path, 'utf8');

// Replace the older, looser check with the strict check
const oldCheck = "const isSuperAdmin = (req.session.user.username === 'admin');";
const newCheck = "const isSuperAdmin = (req.session.user.username === 'admin' && req.session.user.campus_id === 1);";

if (content.includes(oldCheck)) {
    content = content.split(oldCheck).join(newCheck);
    fs.writeFileSync(path, content);
    console.log('Successfully replaced all occurrences of isSuperAdmin check.');
} else {
    console.log('No older checks found (or they were already replaced/modified).');
}
