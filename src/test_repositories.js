/**
 * 🧪 REPOSITORIES TEST RUNNER
 * Tests all newly created repository files against the MySQL database.
 * Run using: node src/test_repositories.js
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Repositories
const AccountRepository = require('./repositories/account.repo');
const WalletRepository = require('./repositories/wallet.repo');
const PaymentRepository = require('./repositories/payment.repo');
const PayrollRepository = require('./repositories/payroll.repo');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'school_management'
};

async function testRepositories() {
    console.log('🧪 Starting ERP repository integration tests...');
    let connection;
    try {
        const pool = mysql.createPool(dbConfig);
        connection = await pool.getConnection();
        console.log('✅ Connection checked.');

        // Instantiation
        const accountRepo = new AccountRepository(pool);
        const walletRepo = new WalletRepository(pool);
        const paymentRepo = new PaymentRepository(pool);
        const payrollRepo = new PayrollRepository(pool);

        // Test 1: Account Repo
        console.log('\n📋 Testing AccountRepository...');
        const accounts = await accountRepo.getAccounts();
        console.log(`  ✓ Retrieved ${accounts.length} accounts.`);
        if (accounts.length === 0) throw new Error('No accounts retrieved.');
        const cashAcc = await accountRepo.getAccountByCode('1010');
        console.log('  ✓ Cash account retrieved: ' + cashAcc.name);
        
        // Test 2: Wallet Repo
        console.log('\n📋 Testing WalletRepository...');
        // We will start a transaction to test wallet operations safely
        await connection.beginTransaction();
        
        // Get student id (1 for testing if it exists, otherwise just try 1)
        const [students] = await connection.query('SELECT id FROM students LIMIT 1');
        if (students.length > 0) {
            const studentId = students[0].id;
            console.log(`  Using existing Student ID: ${studentId}`);
            
            const wallet = await walletRepo.getOrCreateWallet(connection, studentId);
            console.log(`  ✓ Wallet fetched/created. Current Balance: Rs. ${wallet.balance}`);
            
            // Topup
            const refPaymentId = 9999;
            const topupBal = await walletRepo.topUp(connection, studentId, 1500.00, 'Test Wallet Topup', refPaymentId);
            console.log(`  ✓ Topup successful. New Balance: Rs. ${topupBal}`);
            if (parseFloat(topupBal) !== parseFloat(wallet.balance) + 1500.00) {
                throw new Error('Wallet topup amount mismatch.');
            }

            // Debit
            const debitBal = await walletRepo.debit(connection, studentId, 500.00, 'Test Wallet Debit');
            console.log(`  ✓ Debit successful. New Balance: Rs. ${debitBal}`);
            if (parseFloat(debitBal) !== parseFloat(topupBal) - 500.00) {
                throw new Error('Wallet debit amount mismatch.');
            }
        } else {
            console.log('  ⚠️ No students found in database to perform wallet transaction test. Skipping student-bound wallet checks.');
        }
        await connection.rollback(); // Rollback to keep DB clean
        console.log('  ✓ Rolled back transaction safely.');

        // Test 3: Payment Repo
        console.log('\n📋 Testing PaymentRepository...');
        const uniqueId = `evt_${Date.now()}`;
        await paymentRepo.logWebhookEvent(uniqueId, 'stripe', { type: 'payment_intent.succeeded' });
        const loggedEvent = await paymentRepo.getWebhookEvent(uniqueId);
        console.log('  ✓ Webhook event logged and retrieved: ' + loggedEvent.provider);
        if (loggedEvent.event_id !== uniqueId) throw new Error('Webhook event ID mismatch.');

        // Test 4: Payroll Repo
        console.log('\n📋 Testing PayrollRepository...');
        const [teachers] = await pool.query('SELECT id FROM teachers LIMIT 1');
        if (teachers.length > 0) {
            const teacherId = teachers[0].id;
            console.log(`  Using existing Teacher ID: ${teacherId}`);
            
            await payrollRepo.saveSalaryConfig(teacherId, 75000.00, 5.00, 2500.00);
            const salary = await payrollRepo.getSalaryConfig(teacherId);
            console.log(`  ✓ Salary config saved. Base Salary: Rs. ${salary.base_salary}`);
            if (parseFloat(salary.base_salary) !== 75000.00) throw new Error('Base salary configuration mismatch.');
        } else {
            console.log('  ⚠️ No teachers found in database to perform salary config test. Skipping teacher-bound payroll checks.');
        }

        console.log('\n🎉 ALL REPOSITORY INTEGRATION TESTS PASSED SUCCESSFULLY!');
        
        await pool.end();
        console.log('🔌 Connection pool closed.');

    } catch (error) {
        console.error('\n❌ Repository Integration Test Failed:', error.message);
        if (connection) {
            await connection.rollback();
            await connection.release();
        }
    }
}

testRepositories();
