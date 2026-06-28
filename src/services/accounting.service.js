/**
 * 📊 Accounting & General Ledger Service
 * Business logic for double-entry financial accounting:
 *   - Manual Journal Entry creation
 *   - Trial Balance reports
 *   - Profit & Loss (Income Statement) reporting
 *   - Detailed Journal Entry audit logs
 */

const AccountRepository = require('../repositories/account.repo');

class AccountingService {
    constructor(db) {
        this.db = db;
        this.accountRepo = new AccountRepository(db);
    }

    /**
     * Post a manual journal entry (Debit/Credit match checked by repository)
     */
    async postManualEntry(entryDetails, items, createdByUserId) {
        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();

            const entryDetailsWithCreator = {
                ...entryDetails,
                createdBy: createdByUserId
            };

            const entryId = await this.accountRepo.postJournalEntry(
                connection,
                entryDetailsWithCreator,
                items
            );

            await connection.commit();
            return entryId;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Fetch recent journal entries with nested item rows
     */
    async getJournalEntries(limit = 100, campusId = 1) {
        const query = `
            SELECT je.*, u.full_name as creator_name
            FROM journal_entries je
            LEFT JOIN users u ON je.created_by = u.id
            WHERE je.campus_id = ?
            ORDER BY je.entry_date DESC, je.id DESC
            LIMIT ?
        `;
        const [entries] = await this.db.query(query, [campusId, limit]);

        // Fetch detail items for each journal entry
        for (const entry of entries) {
            const itemsQuery = `
                SELECT ji.*, a.account_code, a.name as account_name, a.type as account_type
                FROM journal_items ji
                JOIN accounts a ON ji.account_id = a.id
                WHERE ji.journal_entry_id = ?
            `;
            const [items] = await this.db.query(itemsQuery, [entry.id]);
            entry.items = items || [];
        }

        return entries;
    }

    /**
     * Compute Trial Balance (Sum of debit and credit balances across COA)
     */
    async getTrialBalance(campusId = 1) {
        const accounts = await this.accountRepo.getAccounts(campusId);
        
        let totalDebit = 0;
        let totalCredit = 0;

        const trialBalanceLines = accounts.map(a => {
            const balance = parseFloat(a.current_balance || 0);
            
            // Asset & Expense carry Debit balances
            // Liability, Equity, Income carry Credit balances
            let debit = 0;
            let credit = 0;

            if (a.type === 'Asset' || a.type === 'Expense') {
                debit = balance;
                totalDebit += balance;
            } else {
                credit = balance;
                totalCredit += balance;
            }

            return {
                id: a.id,
                account_code: a.account_code,
                name: a.name,
                type: a.type,
                debit,
                credit
            };
        });

        return {
            lines: trialBalanceLines,
            totalDebit: Math.round(totalDebit * 100) / 100,
            totalCredit: Math.round(totalCredit * 100) / 100
        };
    }

    /**
     * Compute Profit & Loss (Income vs Expense) statement
     */
    async getProfitAndLoss(campusId = 1) {
        const query = `
            SELECT * FROM accounts 
            WHERE campus_id = ? AND (type = 'Income' OR type = 'Expense')
            ORDER BY account_code ASC
        `;
        const [accounts] = await this.db.query(query, [campusId]);

        const incomeLines = [];
        const expenseLines = [];
        let totalIncome = 0;
        let totalExpense = 0;

        accounts.forEach(a => {
            const balance = parseFloat(a.current_balance || 0);
            
            if (a.type === 'Income') {
                incomeLines.push({ name: a.name, code: a.account_code, amount: balance });
                totalIncome += balance;
            } else {
                expenseLines.push({ name: a.name, code: a.account_code, amount: balance });
                totalExpense += balance;
            }
        });

        const netProfit = totalIncome - totalExpense;

        return {
            incomeLines,
            expenseLines,
            totalIncome: Math.round(totalIncome * 100) / 100,
            totalExpense: Math.round(totalExpense * 100) / 100,
            netProfit: Math.round(netProfit * 100) / 100
        };
    }
}

module.exports = AccountingService;
