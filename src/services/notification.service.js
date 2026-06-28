/**
 * 🔔 Notification Service
 * Creates and manages in-app notifications for finance events.
 * 
 * Events covered:
 *   - Fee payment received
 *   - Student wallet top-up
 *   - Payroll approved / disbursed
 *   - Journal entry posted
 *   - Voucher settled
 *   - Low wallet balance
 */

class NotificationService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Create a new notification
     * @param {object} opts - { userId, campusId, type, title, message, link }
     */
    async create({ userId = null, campusId = 1, type = 'info', title, message, link = null }) {
        const [result] = await this.db.query(
            `INSERT INTO notifications (user_id, campus_id, type, title, message, link, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
            [userId, campusId, type, title, message, link]
        );
        return result.insertId;
    }

    /**
     * Broadcast to all admin users in a campus
     */
    async broadcast({ campusId = 1, type = 'info', title, message, link = null }) {
        await this.db.query(
            `INSERT INTO notifications (user_id, campus_id, type, title, message, link, is_read, created_at)
             SELECT id, ?, ?, ?, ?, ?, 0, NOW()
             FROM users
             WHERE (campus_id = ? OR ? = 1) AND role IN ('admin', 'superadmin')`,
            [campusId, type, title, message, link, campusId, campusId]
        );
    }

    /**
     * Get unread notifications for a user (or all admins in campus)
     */
    async getForUser(userId, campusId, limit = 20) {
        const [rows] = await this.db.query(
            `SELECT * FROM notifications
             WHERE (user_id = ? OR (user_id IS NULL AND campus_id = ?))
             ORDER BY created_at DESC
             LIMIT ?`,
            [userId, campusId, limit]
        );
        return rows;
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId, campusId) {
        const [rows] = await this.db.query(
            `SELECT COUNT(*) as cnt FROM notifications
             WHERE is_read = 0
             AND (user_id = ? OR (user_id IS NULL AND campus_id = ?))`,
            [userId, campusId]
        );
        return rows[0]?.cnt || 0;
    }

    /**
     * Get all notifications (admin panel view)
     */
    async getAll(campusId, limit = 50) {
        const [rows] = await this.db.query(
            `SELECT n.*, u.full_name as user_name
             FROM notifications n
             LEFT JOIN users u ON n.user_id = u.id
             WHERE n.campus_id = ?
             ORDER BY n.created_at DESC
             LIMIT ?`,
            [campusId, limit]
        );
        return rows;
    }

    /**
     * Mark notification(s) as read
     */
    async markRead(ids, userId) {
        if (!ids || ids.length === 0) return;
        const placeholders = ids.map(() => '?').join(',');
        await this.db.query(
            `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND (user_id = ? OR user_id IS NULL)`,
            [...ids, userId]
        );
    }

    /**
     * Mark ALL as read for a user
     */
    async markAllRead(userId, campusId) {
        await this.db.query(
            `UPDATE notifications SET is_read = 1
             WHERE is_read = 0 AND (user_id = ? OR (user_id IS NULL AND campus_id = ?))`,
            [userId, campusId]
        );
    }

    /**
     * Delete old notifications (keep last 200)
     */
    async cleanup(campusId) {
        await this.db.query(
            `DELETE FROM notifications WHERE campus_id = ? AND id NOT IN (
                SELECT id FROM (SELECT id FROM notifications WHERE campus_id = ? ORDER BY created_at DESC LIMIT 200) t
             )`,
            [campusId, campusId]
        );
    }

    // ─── Factory helpers for common finance events ───────────────────────────

    async notifyFeePayment({ campusId, studentName, amount, voucherId }) {
        return this.broadcast({
            campusId,
            type: 'success',
            title: 'Fee Payment Received',
            message: `${studentName} paid PKR ${Number(amount).toLocaleString()}`,
            link: `/admin/finance?voucher=${voucherId}`
        });
    }

    async notifyWalletTopup({ campusId, studentName, amount, studentId }) {
        return this.broadcast({
            campusId,
            type: 'info',
            title: 'Wallet Topped Up',
            message: `${studentName}'s wallet credited PKR ${Number(amount).toLocaleString()}`,
            link: `/admin/wallet?student=${studentId}`
        });
    }

    async notifyPayrollApproved({ campusId, month, year, totalAmount, runId }) {
        return this.broadcast({
            campusId,
            type: 'warning',
            title: 'Payroll Approved',
            message: `${month} ${year} payroll approved — PKR ${Number(totalAmount).toLocaleString()} pending disbursal`,
            link: `/admin/payroll?run=${runId}`
        });
    }

    async notifyPayrollDisbursed({ campusId, month, year, totalAmount }) {
        return this.broadcast({
            campusId,
            type: 'success',
            title: 'Payroll Disbursed',
            message: `${month} ${year} payroll of PKR ${Number(totalAmount).toLocaleString()} marked as paid`,
            link: `/admin/payroll`
        });
    }

    async notifyJournalEntry({ campusId, description, amount, entryId }) {
        return this.broadcast({
            campusId,
            type: 'info',
            title: 'Journal Entry Posted',
            message: `${description} — PKR ${Number(amount).toLocaleString()}`,
            link: `/admin/accounting`
        });
    }
}

module.exports = NotificationService;
