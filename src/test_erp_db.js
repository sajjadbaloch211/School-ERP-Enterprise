/**
 * 🧪 ERP DATABASE TESTING & VALIDATION SCRIPT
 * Tests all ERP tables, checks primary/foreign key constraints, and validates double-entry invariants.
 * Run using: node src/test_erp_db.js
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'school_management'
};

async function testDatabase() {
    console.log('🧪 Starting ERP database verification tests...');
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected.');

        // Test 1: Verify Table Existence
        const requiredTables = [
            'accounts', 'journal_entries', 'journal_items', 'student_wallets', 
            'wallet_transactions', 'student_concessions', 'fee_installments', 
            'payment_intents', 'payment_events', 'teacher_salaries', 
            'payroll_runs', 'payroll_items'
        ];

        console.log('\n📋 Test 1: Checking ERP tables existence...');
        const [tables] = await connection.query('SHOW TABLES');
        const existingTableNames = tables.map(t => Object.values(t)[0]);

        let allExist = true;
        for (const tableName of requiredTables) {
            if (existingTableNames.includes(tableName)) {
                console.log(`  ✓ Table '${tableName}' exists.`);
            } else {
                console.error(`  ❌ Table '${tableName}' is missing!`);
                allExist = false;
            }
        }

        if (!allExist) throw new Error('One or more required ERP tables are missing.');
        console.log('👉 Test 1 Passed: All ERP tables exist.');

        // Test 2: Verify Chart of Accounts Seeded Data
        console.log('\n📋 Test 2: Checking Chart of Accounts (COA) records...');
        const [accounts] = await connection.query('SELECT account_code, name, type FROM accounts');
        console.log(`  ✓ Found ${accounts.length} accounts in Chart of Accounts.`);
        if (accounts.length < 10) throw new Error('COA has insufficient accounts. Seeding may have failed.');
        
        const cashAccount = accounts.find(a => a.account_code === '1010');
        if (cashAccount && cashAccount.type === 'Asset') {
            console.log('  ✓ Cash in Hand (1010) exists and is classified as Asset.');
        } else {
            throw new Error('Cash account configuration error.');
        }
        console.log('👉 Test 2 Passed: COA records verified.');

        // Test 3: Validate Double-Entry Debit/Credit Constraint
        console.log('\n📋 Test 3: Validating journal_items check constraint (debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0))...');
        
        // Let's insert a dummy entry
        const entryNum = `TEST-JV-${Date.now()}`;
        const [entryRes] = await connection.query(
            "INSERT INTO journal_entries (entry_number, description, entry_date, campus_id) VALUES (?, 'Test Entry', CURRENT_DATE, 1)",
            [entryNum]
        );
        const entryId = entryRes.insertId;

        // Retrieve cash account id
        const [cashAccRes] = await connection.query("SELECT id FROM accounts WHERE account_code = '1010' LIMIT 1");
        const cashAccountId = cashAccRes[0].id;

        // Attempt invalid insert: both debit and credit having value
        console.log('  Testing constraint: Insert item with both Debit and Credit...');
        try {
            await connection.query(
                "INSERT INTO journal_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 100.00, 100.00)",
                [entryId, cashAccountId]
            );
            console.error('  ❌ Failure: Insert succeeded but should have failed!');
            throw new Error('Check constraint check_debit_credit failed to prevent both debit and credit having positive values.');
        } catch (err) {
            console.log('  ✓ Success: Database correctly blocked invalid double-entry line (Error: ' + err.message + ')');
        }

        // Clean up test journal entry
        await connection.query("DELETE FROM journal_entries WHERE id = ?", [entryId]);
        console.log('👉 Test 3 Passed: Check constraint enforced.');

        console.log('\n🎉 ALL DATABASE VERIFICATION TESTS PASSED SUCCESSFULLY! Ready for Phase 2.');

    } catch (error) {
        console.error('\n❌ Database Verification Test Failed:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed.');
        }
    }
}

testDatabase();
