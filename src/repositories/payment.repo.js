/**
 * 🗄️ Payment Repository
 * Handles all database operations for online payment intents and webhook events.
 */

class PaymentRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * Create a payment intent log
     */
    async createPaymentIntent(details) {
        const { studentId, feeId, provider, providerIntentId, amountPaisa, idempotencyKey } = details;
        const query = `
            INSERT INTO payment_intents (student_id, fee_id, provider, provider_intent_id, amount_paisa, idempotency_key, status)
            VALUES (?, ?, ?, ?, ?, ?, 'created')
        `;
        const [result] = await this.db.query(query, [
            studentId, feeId || null, provider, providerIntentId, amountPaisa, idempotencyKey
        ]);
        return result.insertId;
    }

    /**
     * Fetch payment intent by provider key
     */
    async getPaymentIntent(provider, providerIntentId) {
        const query = `
            SELECT * FROM payment_intents 
            WHERE provider = ? AND provider_intent_id = ? 
            LIMIT 1
        `;
        const [rows] = await this.db.query(query, [provider, providerIntentId]);
        return rows[0] || null;
    }

    /**
     * Update payment intent status (within transaction)
     */
    async updateIntentStatus(connection, intentId, status) {
        const query = 'UPDATE payment_intents SET status = ? WHERE id = ?';
        await connection.query(query, [status, intentId]);
    }

    /**
     * Check if a webhook event has been recorded / processed
     */
    async getWebhookEvent(eventId) {
        const query = 'SELECT * FROM payment_events WHERE event_id = ? LIMIT 1';
        const [rows] = await this.db.query(query, [eventId]);
        return rows[0] || null;
    }

    /**
     * Log an incoming webhook event (before processing)
     */
    async logWebhookEvent(eventId, provider, payload) {
        const query = `
            INSERT INTO payment_events (event_id, provider, payload, processed)
            VALUES (?, ?, ?, FALSE)
            ON DUPLICATE KEY UPDATE provider = VALUES(provider)
        `;
        await this.db.query(query, [eventId, provider, JSON.stringify(payload)]);
    }

    /**
     * Mark event as processed (within transaction)
     */
    async markEventProcessed(connection, eventId) {
        const query = 'UPDATE payment_events SET processed = TRUE WHERE event_id = ?';
        await connection.query(query, [eventId]);
    }
}

module.exports = PaymentRepository;
