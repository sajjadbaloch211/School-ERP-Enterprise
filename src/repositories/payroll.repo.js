/**
 * 🗄️ Payroll Repository
 * Handles salary configurations, payroll runs, and payroll items operations.
 */

class PayrollRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Get basic salary details for a teacher
     */
    async getSalaryConfig(teacherId) {
        const query = 'SELECT * FROM teacher_salaries WHERE teacher_id = ? LIMIT 1';
        const [rows] = await this.db.query(query, [teacherId]);
        return rows[0] || null;
    }

    /**
     * Create or update a salary configuration
     */
    async saveSalaryConfig(teacherId, baseSalary, taxRatePercent = 0.00, allowances = 0.00) {
        const query = `
            INSERT INTO teacher_salaries (teacher_id, base_salary, tax_rate_percent, allowances)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                base_salary = VALUES(base_salary), 
                tax_rate_percent = VALUES(tax_rate_percent), 
                allowances = VALUES(allowances)
        `;
        await this.db.query(query, [teacherId, baseSalary, taxRatePercent, allowances]);
    }

    /**
     * Create a new payroll run batch
     */
    async createPayrollRun(month, year, createdByUserId) {
        const query = `
            INSERT INTO payroll_runs (month, year, status, created_by)
            VALUES (?, ?, 'draft', ?)
        `;
        const [res] = await this.db.query(query, [month, year, createdByUserId]);
        return res.insertId;
    }

    /**
     * Get details of a payroll run
     */
    async getPayrollRun(runId) {
        const query = 'SELECT * FROM payroll_runs WHERE id = ? LIMIT 1';
        const [rows] = await this.db.query(query, [runId]);
        return rows[0] || null;
    }

    /**
     * Check if a payroll run already exists for a month/year
     */
    async checkDuplicatePayrollRun(month, year) {
        const query = 'SELECT * FROM payroll_runs WHERE month = ? AND year = ? LIMIT 1';
        const [rows] = await this.db.query(query, [month, year]);
        return rows[0] || null;
    }

    /**
     * Add line item to a payroll run (within transaction)
     */
    async addPayrollItem(connection, itemDetails) {
        const { payrollRunId, teacherId, baseSalary, allowances, deductionsLeaves, overtimeAllowance, taxDeduction, netPayable } = itemDetails;
        const query = `
            INSERT INTO payroll_items (
                payroll_run_id, teacher_id, base_salary, allowances, 
                deductions_leaves, overtime_allowance, tax_deduction, net_payable, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;
        const [res] = await connection.query(query, [
            payrollRunId, teacherId, baseSalary, allowances, 
            deductionsLeaves, overtimeAllowance, taxDeduction, netPayable
        ]);
        return res.insertId;
    }

    /**
     * Fetch all items in a payroll run
     */
    async getPayrollItems(runId) {
        const query = `
            SELECT pi.*, u.full_name, t.phone, d.name as department_name
            FROM payroll_items pi
            JOIN teachers t ON pi.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            LEFT JOIN departments d ON t.department_id = d.id
            WHERE pi.payroll_run_id = ?
        `;
        const [rows] = await this.db.query(query, [runId]);
        return rows;
    }

    /**
     * Approve payroll run batch (within transaction)
     */
    async approvePayrollRun(connection, runId, approvedByUserId) {
        const query = `
            UPDATE payroll_runs 
            SET status = 'approved', approved_by = ? 
            WHERE id = ?
        `;
        await connection.query(query, [approvedByUserId, runId]);

        // Also update all items under this run to approved
        const updateItemsQuery = `
            UPDATE payroll_items 
            SET status = 'approved' 
            WHERE payroll_run_id = ? AND status = 'pending'
        `;
        await connection.query(updateItemsQuery, [runId]);
    }

    /**
     * Mark an individual payroll item as paid (within transaction)
     */
    async markItemPaid(connection, itemId, journalEntryId = null) {
        const query = `
            UPDATE payroll_items 
            SET status = 'paid', journal_entry_id = ? 
            WHERE id = ?
        `;
        await connection.query(query, [journalEntryId, itemId]);
    }

    /**
     * Mark all approved items in a run as paid (within transaction)
     */
    async markRunPaid(connection, runId) {
        const query = `
            UPDATE payroll_runs 
            SET status = 'paid' 
            WHERE id = ?
        `;
        await connection.query(query, [runId]);
    }
}

module.exports = PayrollRepository;
