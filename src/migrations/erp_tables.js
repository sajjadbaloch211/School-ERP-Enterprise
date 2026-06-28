/**
 * 🏢 ENTERPRISE ERP DATABASE MIGRATION SCRIPT
 * Creates all tables required for Accounting (Double-Entry Ledger), Payments, Student Wallets, and Payroll.
 * Run using: node src/migrations/erp_tables.js
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'school_management'
};

async function runMigration() {
    console.log('🚀 Connecting to database for ERP migration...', dbConfig);
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected successfully!');

        // Disable foreign key checks momentarily to prevent constraint issues during migration
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('⚙️ Creating ERP database tables...');

        // 1. ACCOUNTS (Chart of Accounts)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campus_id INT DEFAULT 1,
                account_code VARCHAR(20) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                type ENUM('Asset', 'Liability', 'Equity', 'Income', 'Expense') NOT NULL,
                parent_id INT DEFAULT NULL,
                current_balance DECIMAL(12,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES accounts(id) ON DELETE SET NULL,
                FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='ERP Chart of Accounts';
        `);
        console.log('✓ Created table: accounts');

        // 2. JOURNAL ENTRIES (General Ledger Header)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS journal_entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                campus_id INT DEFAULT 1,
                entry_number VARCHAR(50) NOT NULL UNIQUE,
                description VARCHAR(255) NOT NULL,
                reference VARCHAR(100) DEFAULT NULL,
                entry_date DATE NOT NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='General Ledger Entry Headers';
        `);
        console.log('✓ Created table: journal_entries');

        // 3. JOURNAL ITEMS (Double-Entry lines)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS journal_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                journal_entry_id INT NOT NULL,
                account_id INT NOT NULL,
                debit DECIMAL(12,2) DEFAULT 0.00,
                credit DECIMAL(12,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
                FOREIGN KEY (account_id) REFERENCES accounts(id),
                CONSTRAINT check_debit_credit CHECK (debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0))
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='General Ledger Debit/Credit Lines';
        `);
        console.log('✓ Created table: journal_items');

        // 4. STUDENT WALLETS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS student_wallets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT UNIQUE NOT NULL,
                balance DECIMAL(12,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Student Digital Wallets';
        `);
        console.log('✓ Created table: student_wallets');

        // 5. WALLET TRANSACTIONS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                type ENUM('credit', 'debit') NOT NULL,
                description VARCHAR(255) NOT NULL,
                reference_payment_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wallet_id) REFERENCES student_wallets(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Wallet Transaction Logs';
        `);
        console.log('✓ Created table: wallet_transactions');

        // 6. STUDENT CONCESSIONS (Discounts / Scholarships)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS student_concessions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                type ENUM('scholarship', 'discount', 'sibling_discount') NOT NULL,
                value_type ENUM('percentage', 'flat') NOT NULL,
                value DECIMAL(10,2) NOT NULL,
                reason VARCHAR(255) DEFAULT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Student Concessions';
        `);
        console.log('✓ Created table: student_concessions');

        // 7. FEE INSTALLMENTS (Partial Payments support)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS fee_installments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                fee_id INT NOT NULL,
                installment_number INT NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                due_date DATE NOT NULL,
                status ENUM('unpaid', 'partially_paid', 'paid') DEFAULT 'unpaid',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Fee Installment Split Schedule';
        `);
        console.log('✓ Created table: fee_installments');

        // 8. PAYMENT INTENTS (Stripe / JazzCash / Easypaisa payment log)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_intents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT NOT NULL,
                fee_id INT DEFAULT NULL,
                provider VARCHAR(50) NOT NULL,
                provider_intent_id VARCHAR(255) UNIQUE NOT NULL,
                amount_paisa INT NOT NULL,
                currency VARCHAR(3) DEFAULT 'PKR',
                status ENUM('created', 'processing', 'succeeded', 'failed', 'canceled') DEFAULT 'created',
                idempotency_key VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Online Payment Intent Logs';
        `);
        console.log('✓ Created table: payment_intents');

        // 9. PAYMENT EVENTS (Idempotent Webhook Events Log)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_events (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(255) UNIQUE NOT NULL,
                provider VARCHAR(50) NOT NULL,
                payload JSON NOT NULL,
                processed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Idempotent Webhook Events Log';
        `);
        console.log('✓ Created table: payment_events');

        // 10. TEACHER SALARIES (Salary config per teacher)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS teacher_salaries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT UNIQUE NOT NULL,
                base_salary DECIMAL(12,2) NOT NULL,
                tax_rate_percent DECIMAL(5,2) DEFAULT 0.00,
                allowances DECIMAL(12,2) DEFAULT 0.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Salary Configurations for Teachers';
        `);
        console.log('✓ Created table: teacher_salaries');

        // 11. PAYROLL RUNS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payroll_runs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                month VARCHAR(20) NOT NULL,
                year INT NOT NULL,
                status ENUM('draft', 'approved', 'paid') DEFAULT 'draft',
                created_by INT,
                approved_by INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Monthly Payroll Run Batches';
        `);
        console.log('✓ Created table: payroll_runs');

        // 12. PAYROLL ITEMS
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payroll_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                payroll_run_id INT NOT NULL,
                teacher_id INT NOT NULL,
                base_salary DECIMAL(12,2) NOT NULL,
                allowances DECIMAL(12,2) DEFAULT 0.00,
                deductions_leaves DECIMAL(12,2) DEFAULT 0.00,
                overtime_allowance DECIMAL(12,2) DEFAULT 0.00,
                tax_deduction DECIMAL(12,2) DEFAULT 0.00,
                net_payable DECIMAL(12,2) NOT NULL,
                status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
                journal_entry_id INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Individual Teacher Payroll Line Items';
        `);
        console.log('✓ Created table: payroll_items');

        // ⚙️ Seeding Chart of Accounts (COA) defaults
        console.log('🌱 Seeding default Chart of Accounts (COA)...');
        const defaultAccounts = [
            // Assets
            { code: '1010', name: 'Cash in Hand', type: 'Asset' },
            { code: '1020', name: 'Bank Account (Main)', type: 'Asset' },
            { code: '1030', name: 'Student Wallet Trust', type: 'Asset' },
            { code: '1200', name: 'Tuition Fees Receivable', type: 'Asset' },
            
            // Liabilities
            { code: '2100', name: 'Accounts Payable', type: 'Liability' },
            { code: '2200', name: 'Accrued Payroll Liability', type: 'Liability' },

            // Equity
            { code: '3000', name: 'Retained Earnings', type: 'Equity' },

            // Income
            { code: '4010', name: 'Tuition Fee Revenue', type: 'Income' },
            { code: '4020', name: 'Admission Fee Revenue', type: 'Income' },
            { code: '4030', name: 'Late Fee / Fine Revenue', type: 'Income' },
            { code: '4040', name: 'Other Income', type: 'Income' },

            // Expenses
            { code: '5010', name: 'Teacher Salary Expense', type: 'Expense' },
            { code: '5020', name: 'Rent & Utility Expense', type: 'Expense' },
            { code: '5030', name: 'Tax Expense', type: 'Expense' },
            { code: '5040', name: 'Administrative Expense', type: 'Expense' }
        ];

        for (const account of defaultAccounts) {
            await connection.query(
                `INSERT INTO accounts (account_code, name, type, campus_id) 
                 VALUES (?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type)`,
                [account.code, account.name, account.type]
            );
        }
        console.log('✅ Default Chart of Accounts seeded!');

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🚀 ERP Migration Complete!');

    } catch (error) {
        console.error('❌ Migration Error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed.');
        }
    }
}

runMigration();
