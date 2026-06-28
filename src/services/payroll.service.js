/**
 * 💼 Teacher Payroll Service
 * Orchestrates salary configuration, monthly draft runs, leave deductions,
 * bank transfers bulk export, and double-entry general ledger posting.
 */

const PayrollRepository = require('../repositories/payroll.repo');
const AccountRepository = require('../repositories/account.repo');

class PayrollService {
    constructor(db) {
        this.db = db;
        this.payrollRepo = new PayrollRepository(db);
        this.accountRepo = new AccountRepository(db);
    }

    /**
     * Create the teacher_attendance table dynamically if not exists.
     */
    async ensureTeacherAttendanceTable() {
        const query = `
            CREATE TABLE IF NOT EXISTS teacher_attendance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT NOT NULL,
                date DATE NOT NULL,
                status ENUM('present', 'absent', 'leave', 'late') DEFAULT 'present',
                marked_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
                UNIQUE KEY teacher_date (teacher_id, date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `;
        await this.db.query(query);
    }

    /**
     * Fetch teacher attendance summary (number of absences) for a specific month and year
     */
    async getTeacherAbsenceCount(teacherId, monthName, year) {
        await this.ensureTeacherAttendanceTable();

        // Convert Month Name (e.g. "January") to number range
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthNum = months.indexOf(monthName) + 1;
        if (monthNum === 0) return 0;

        const query = `
            SELECT COUNT(*) as absence_count FROM teacher_attendance
            WHERE teacher_id = ? 
              AND status = 'absent'
              AND MONTH(date) = ?
              AND YEAR(date) = ?
        `;
        const [rows] = await this.db.query(query, [teacherId, monthNum, year]);
        return rows[0] ? parseInt(rows[0].absence_count) : 0;
    }

    /**
     * Get or calculate draft payroll line items for a given month and year
     */
    async getOrCalculatePayroll(month, year, campusId) {
        await this.ensureTeacherAttendanceTable();

        // Check if run already exists
        const existingRun = await this.payrollRepo.checkDuplicatePayrollRun(month, year);
        if (existingRun) {
            // Retrieve calculated items
            const items = await this.payrollRepo.getPayrollItems(existingRun.id);
            return { run: existingRun, items };
        }

        // Return calculated draft items (dry run)
        const teachersQuery = `
            SELECT t.id as teacher_id, u.full_name, t.salary as default_salary, ts.base_salary, ts.tax_rate_percent, ts.allowances, d.name as department_name
            FROM teachers t
            JOIN users u ON t.user_id = u.id
            LEFT JOIN teacher_salaries ts ON t.id = ts.teacher_id
            LEFT JOIN departments d ON t.department_id = d.id
            WHERE t.campus_id = ?
        `;
        const [teachers] = await this.db.query(teachersQuery, [campusId]);

        const draftItems = [];
        for (const t of teachers) {
            const baseSalary = parseFloat(t.base_salary || t.default_salary || 0);
            const taxRate = parseFloat(t.tax_rate_percent || 0);
            const allowances = parseFloat(t.allowances || 0);

            // Fetch absences for leaf deductions
            const absences = await this.getTeacherAbsenceCount(t.teacher_id, month, year);
            const deductionsLeaves = Math.round(((baseSalary / 30) * absences) * 100) / 100;
            
            // Tax deduction
            const taxDeduction = Math.round((baseSalary * (taxRate / 100)) * 100) / 100;
            
            // Overtime & Net calculations
            const overtimeAllowance = 0.00; // Overtime calculation logic extension placeholder
            const netPayable = Math.max(0, baseSalary + allowances + overtimeAllowance - deductionsLeaves - taxDeduction);

            draftItems.push({
                teacher_id: t.teacher_id,
                full_name: t.full_name,
                department_name: t.department_name || 'N/A',
                base_salary: baseSalary,
                allowances,
                deductions_leaves: deductionsLeaves,
                overtime_allowance: overtimeAllowance,
                tax_deduction: taxDeduction,
                net_payable: netPayable,
                absences,
                status: 'draft'
            });
        }

        return { run: null, items: draftItems };
    }

    /**
     * Create a permanent monthly payroll run batch and lock its values
     */
    async generatePayrollRun(month, year, adminUserId, campusId) {
        const existingRun = await this.payrollRepo.checkDuplicatePayrollRun(month, year);
        if (existingRun) throw new Error(`Payroll run for ${month} ${year} already exists.`);

        // Get calculations
        const { items } = await this.getOrCalculatePayroll(month, year, campusId);
        if (items.length === 0) throw new Error('No staff members found to process payroll.');

        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Create run header
            const runId = await this.payrollRepo.createPayrollRun(month, year, adminUserId);

            // 2. Insert items
            for (const item of items) {
                await this.payrollRepo.addPayrollItem(connection, {
                    payrollRunId: runId,
                    teacherId: item.teacher_id,
                    baseSalary: item.base_salary,
                    allowances: item.allowances,
                    deductionsLeaves: item.deductions_leaves,
                    overtimeAllowance: item.overtime_allowance,
                    taxDeduction: item.tax_deduction,
                    netPayable: item.net_payable
                });
            }

            await connection.commit();
            return runId;
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Approve draft payroll run
     */
    async approvePayroll(runId, adminUserId) {
        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();
            await this.payrollRepo.approvePayrollRun(connection, runId, adminUserId);
            await connection.commit();
            return { success: true };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Disburse payroll run items & post double-entry accounting entries
     */
    async disbursePayroll(runId, adminUserId) {
        const run = await this.payrollRepo.getPayrollRun(runId);
        if (!run) throw new Error('Payroll run not found.');
        if (run.status !== 'approved') throw new Error('Only approved payroll runs can be disbursed.');

        const items = await this.payrollRepo.getPayrollItems(runId);
        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Get Accounts (Debit: Salary Expense 5010, Credit: Bank 1020)
            const expenseAcc = await this.accountRepo.getAccountByCode('5010');
            const bankAcc = await this.accountRepo.getAccountByCode('1020');

            if (!expenseAcc || !bankAcc) {
                throw new Error('Chart of Accounts configuration missing: Salary Expense (5010) or Bank (1020).');
            }

            for (const item of items) {
                if (item.status === 'paid') continue;

                // 2. Post Journal Entry
                const entryNum = `PAY-${run.month.toUpperCase().slice(0,3)}-${run.year}-${item.teacher_id}-${Date.now().toString().slice(-4)}`;
                const journalDetails = {
                    entryNumber: entryNum,
                    description: `Salary disbursement for ${item.full_name} (${run.month} ${run.year})`,
                    reference: `Payroll Run #${runId}`,
                    entryDate: new Date().toISOString().split('T')[0],
                    campusId: run.campus_id || 1
                };

                const ledgerLines = [
                    { accountId: expenseAcc.id, debit: parseFloat(item.net_payable), credit: 0.00 }, // Dr Salary Expense
                    { accountId: bankAcc.id, debit: 0.00, credit: parseFloat(item.net_payable) }    // Cr Bank Account
                ];

                const journalEntryId = await this.accountRepo.postJournalEntry(connection, journalDetails, ledgerLines);

                // 3. Mark payroll item paid
                await this.payrollRepo.markItemPaid(connection, item.id, journalEntryId);
            }

            // 4. Update run status to paid
            await this.payrollRepo.markRunPaid(connection, runId);

            await connection.commit();
            return { success: true };
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    }

    /**
     * Export Standard Bank Bulk Transfer CSV format
     */
    generateBulkTransferCSV(runMonth, runYear, items) {
        let csvContent = "Beneficiary Name,Account Number,Bank Name,Branch Code,Amount,Description\n";
        for (const item of items) {
            // In a real application, bank details would be fetched from teacher profile.
            // We use standard placeholder values matching typical local bank requirements.
            const dummyAcc = `PK00BANK${String(item.teacher_id).padStart(10, '0')}`;
            csvContent += `"${item.full_name}","${dummyAcc}","Habib Bank Limited","0123",${item.net_payable},"Salary ${runMonth} ${runYear}"\n`;
        }
        return csvContent;
    }
}

module.exports = PayrollService;
