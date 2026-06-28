/**
 * 🗄️ Student Wallet Repository
 * Handles all wallet balance queries, top-ups, debits, and transaction logs.
 */

class WalletRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get student wallet details. Automatically creates one if not exists.
     */
    async getOrCreateWallet(connection, studentId) {
        const query = 'SELECT * FROM student_wallets WHERE student_id = ? LIMIT 1 FOR UPDATE';
        const [rows] = await connection.query(query, [studentId]);
        
        if (rows.length > 0) {
            return rows[0];
        }

        // Create new wallet
        const insertQuery = 'INSERT INTO student_wallets (student_id, balance) VALUES (?, 0.00)';
        const [res] = await connection.query(insertQuery, [studentId]);
        
        return {
            id: res.insertId,
            student_id: studentId,
            balance: 0.00
        };
    }

    /**
     * Fetch all transactions for a wallet
     */
    async getTransactionHistory(walletId) {
        const query = `
            SELECT * FROM wallet_transactions 
            WHERE wallet_id = ? 
            ORDER BY id DESC
        `;
        const [rows] = await this.db.query(query, [walletId]);
        return rows;
    }

    /**
     * Credit / top-up student wallet (within transaction)
     */
    async topUp(connection, studentId, amount, description, referencePaymentId = null) {
        const wallet = await this.getOrCreateWallet(connection, studentId);
        const newBalance = parseFloat(wallet.balance) + parseFloat(amount);

        // Update Balance
        await connection.query(
            'UPDATE student_wallets SET balance = ? WHERE id = ?',
            [newBalance, wallet.id]
        );

        // Log Transaction
        await connection.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, type, description, reference_payment_id) 
             VALUES (?, ?, 'credit', ?, ?)`,
            [wallet.id, amount, description, referencePaymentId]
        );

        return newBalance;
    }

    /**
     * Debit / charge student wallet (within transaction)
     */
    async debit(connection, studentId, amount, description) {
        const wallet = await this.getOrCreateWallet(connection, studentId);
        const currentBalance = parseFloat(wallet.balance);
        const debitAmt = parseFloat(amount);

        if (currentBalance < debitAmt) {
            throw new Error(`Insufficient wallet balance. Required: Rs. ${debitAmt}, Available: Rs. ${currentBalance}`);
        }

        const newBalance = currentBalance - debitAmt;

        // Update Balance
        await connection.query(
            'UPDATE student_wallets SET balance = ? WHERE id = ?',
            [newBalance, wallet.id]
        );

        // Log Transaction
        await connection.query(
            `INSERT INTO wallet_transactions (wallet_id, amount, type, description) 
             VALUES (?, ?, 'debit', ?)`,
            [wallet.id, debitAmt, description]
        );

        return newBalance;
    }
}

module.exports = WalletRepository;
