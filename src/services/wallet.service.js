/**
 * 💰 Wallet Service
 * Business logic for student wallet management:
 *   - Manual cash top-ups by admin
 *   - Auto-settle outstanding voucher dues from wallet balance
 *   - Concession / scholarship application
 */

const WalletRepository = require('../repositories/wallet.repo');

class WalletService {
    constructor(db) {
        this.db = db;
        this.walletRepo = new WalletRepository(db);
    }

    /**
     * Get wallet details for a student
     */
    async getWalletDetails(studentId) {
        const [students] = await this.db.query(
            `SELECT s.id, s.campus_id, u.full_name, u.email,
                    c.class_name, c.section, c.monthly_fee
             FROM students s
             JOIN users u ON s.user_id = u.id
             JOIN classes c ON s.class_id = c.id
             WHERE s.id = ? LIMIT 1`,
            [studentId]
        );
        if (!students.length) throw new Error('Student not found.');

        const student = students[0];

        // Wallet record (if exists)
        const [wallets] = await this.db.query(
            'SELECT * FROM student_wallets WHERE student_id = ? LIMIT 1',
            [studentId]
        );
        const wallet = wallets[0] || { balance: 0, id: null };

        // Transaction history
        const txHistory = wallet.id
            ? await this.walletRepo.getTransactionHistory(wallet.id)
            : [];

        // Current outstanding dues
        const [vouchers] = await this.db.query(
            'SELECT * FROM vouchers WHERE student_id = ? AND academic_year = YEAR(CURRENT_DATE) LIMIT 1',
            [studentId]
        );
        const currentDues = vouchers[0] ? parseFloat(vouchers[0].remaining_balance) : 0;

        // Applied concessions
        const [concessions] = await this.db.query(
            'SELECT * FROM student_concessions WHERE student_id = ? AND is_active = TRUE',
            [studentId]
        );

        return { student, wallet, txHistory, currentDues, concessions };
    }

    /**
     * Admin manually tops up a student wallet (cash/bank payment at counter)
     */
    async adminTopUp(studentId, amount, description, adminUserId) {
        if (parseFloat(amount) <= 0) throw new Error('Top-up amount must be greater than zero.');

        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();
            const newBalance = await this.walletRepo.topUp(
                connection, studentId, amount,
                description || 'Admin Cash Top-up',
                null
            );
            await connection.commit();
            return { success: true, newBalance };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Auto-settle outstanding fee dues from student wallet balance
     * (Debits wallet, credits fee_payments)
     */
    async settleFromWallet(studentId, adminUserId) {
        const [wallets] = await this.db.query(
            'SELECT * FROM student_wallets WHERE student_id = ? LIMIT 1',
            [studentId]
        );
        if (!wallets.length || parseFloat(wallets[0].balance) <= 0) {
            throw new Error('Wallet has no balance to settle with.');
        }

        const [vouchers] = await this.db.query(
            'SELECT * FROM vouchers WHERE student_id = ? AND academic_year = YEAR(CURRENT_DATE) AND remaining_balance > 0 LIMIT 1',
            [studentId]
        );
        if (!vouchers.length) {
            throw new Error('No outstanding dues found for this student.');
        }

        const voucher = vouchers[0];
        const walletBalance = parseFloat(wallets[0].balance);
        const outstanding = parseFloat(voucher.remaining_balance);

        // Settle the minimum of wallet balance vs outstanding dues
        const settleAmount = Math.min(walletBalance, outstanding);

        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Debit wallet
            await this.walletRepo.debit(
                connection, studentId, settleAmount,
                `Auto-Settle: Fee dues for Academic Year ${voucher.academic_year}`
            );

            // 2. Record fee payment
            const receiptNo = `WLT-${Date.now()}`;
            const [studs] = await connection.query('SELECT campus_id FROM students WHERE id = ?', [studentId]);
            const campusId = studs[0]?.campus_id || 1;

            await connection.execute(
                `INSERT INTO fee_payments (voucher_id, amount_paid, payment_method, receipt_no, recorded_by, fee_id, campus_id)
                 VALUES (?, ?, 'Wallet', ?, ?, NULL, ?)`,
                [voucher.id, settleAmount, receiptNo, adminUserId, campusId]
            );

            // 3. Update voucher totals
            const newPaid = parseFloat(voucher.total_paid) + settleAmount;
            const newBal = parseFloat(voucher.remaining_balance) - settleAmount;
            await connection.execute(
                'UPDATE vouchers SET total_paid = ?, remaining_balance = ? WHERE id = ?',
                [newPaid, newBal, voucher.id]
            );

            await connection.commit();
            return { success: true, settled: settleAmount, newBalance: walletBalance - settleAmount };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Add or update a concession/scholarship for a student
     */
    async applyConcession(studentId, type, valueType, value, reason) {
        // Deactivate previous concessions of same type
        await this.db.query(
            'UPDATE student_concessions SET is_active = FALSE WHERE student_id = ? AND type = ?',
            [studentId, type]
        );

        await this.db.query(
            `INSERT INTO student_concessions (student_id, type, value_type, value, reason, is_active)
             VALUES (?, ?, ?, ?, ?, TRUE)`,
            [studentId, type, valueType, value, reason || null]
        );

        return { success: true };
    }
}

module.exports = WalletService;
