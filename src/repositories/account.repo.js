/**
 * 🗄️ Chart of Accounts Repository
 * Handles all database operations for accounts, journal entries, and journal items.
 */

class AccountRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Fetch all Chart of Account accounts
     */
    async getAccounts(campusId = 1) {
        const query = `
            SELECT * FROM accounts 
            WHERE campus_id = ? 
            ORDER BY account_code ASC
        `;
        const [rows] = await this.db.query(query, [campusId]);
        return rows;
    }

    /**
     * Get account details by account code
     */
    async getAccountByCode(code, campusId = 1) {
        const query = `
            SELECT * FROM accounts 
            WHERE account_code = ? AND campus_id = ? 
            LIMIT 1
        `;
        const [rows] = await this.db.query(query, [code, campusId]);
        return rows[0] || null;
    }

    /**
     * Create a new Account in COA
     */
    async createAccount(code, name, type, parentId = null, campusId = 1) {
        const query = `
            INSERT INTO accounts (account_code, name, type, parent_id, campus_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await this.db.query(query, [code, name, type, parentId, campusId]);
        return result.insertId;
    }

    /**
     * Update account balance (within active transaction connection)
     */
    async updateBalance(connection, accountId, amount, type) {
        // Safe lock row for update
        const selectQuery = 'SELECT current_balance FROM accounts WHERE id = ? FOR UPDATE';
        const [rows] = await connection.query(selectQuery, [accountId]);
        if (rows.length === 0) throw new Error(`Account ID ${accountId} not found.`);

        const currentBalance = parseFloat(rows[0].current_balance);
        let newBalance = currentBalance;

        if (type === 'debit') {
            newBalance += parseFloat(amount);
        } else if (type === 'credit') {
            newBalance -= parseFloat(amount);
        }

        const updateQuery = 'UPDATE accounts SET current_balance = ? WHERE id = ?';
        await connection.query(updateQuery, [newBalance, accountId]);
        return newBalance;
    }

    /**
     * Post a new Double-Entry Journal Entry
     * @param {Object} connection - Transaction connection
     * @param {Object} entryDetails - { entryNumber, description, reference, entryDate, campusId }
     * @param {Array} items - Array of { accountId, debit, credit }
     */
    async postJournalEntry(connection, entryDetails, items) {
        const { entryNumber, description, reference, entryDate, campusId } = entryDetails;

        // 1. Insert Journal Entry Header
        const headerQuery = `
            INSERT INTO journal_entries (entry_number, description, reference, entry_date, campus_id)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [headerRes] = await connection.query(headerQuery, [
            entryNumber, description, reference || null, entryDate, campusId
        ]);
        const entryId = headerRes.insertId;

        // 2. Validate Debits equals Credits
        let totalDebit = 0;
        let totalCredit = 0;

        for (const item of items) {
            totalDebit += parseFloat(item.debit || 0);
            totalCredit += parseFloat(item.credit || 0);
        }

        // Avoid floating point precision issues by rounding to 2 decimal places
        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            throw new Error(`Double-entry balance mismatch! Debits (Rs. ${totalDebit}) must equal Credits (Rs. ${totalCredit}).`);
        }

        // 3. Insert Journal Lines & Update account balances
        const itemQuery = `
            INSERT INTO journal_items (journal_entry_id, account_id, debit, credit)
            VALUES (?, ?, ?, ?)
        `;

        for (const item of items) {
            await connection.query(itemQuery, [entryId, item.accountId, item.debit || 0, item.credit || 0]);
            
            // Adjust balance: Debit increases asset/expense, credit increases liability/equity/income.
            // Rather than dynamic balance rules per type, we will follow the standard algebraic sign logic:
            // Debit increases the balance, Credit decreases the balance.
            // This is clean and matches ledger reporting.
            const operation = parseFloat(item.debit) > 0 ? 'debit' : 'credit';
            const value = parseFloat(item.debit) > 0 ? item.debit : item.credit;
            
            await this.updateBalance(connection, item.accountId, value, operation);
        }

        return entryId;
    }
}

module.exports = AccountRepository;
