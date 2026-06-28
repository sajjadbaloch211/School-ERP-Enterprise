/**
 * 🛠️ Payment Integration Service
 * Orchestrates payment intent creation, provider resolution, webhook verification,
 * and transaction execution.
 */

const crypto = require('crypto');
const StripeProvider = require('../providers/payment/stripe.provider');
const PaymentRepository = require('../repositories/payment.repo');
const WalletRepository = require('../repositories/wallet.repo');

class PaymentService {
    constructor(db, stripeKey) {
        this.db = db;
        this.paymentRepo = new PaymentRepository(db);
        this.walletRepo = new WalletRepository(db);

        // Register payment providers
        this.providers = {
            stripe: new StripeProvider(stripeKey)
        };
    }

    /**
     * Resolve provider by name
     */
    getProvider(name) {
        const provider = this.providers[name.toLowerCase()];
        if (!provider) throw new Error(`Payment provider '${name}' not supported.`);
        return provider;
    }

    /**
     * Initiate payment intent for a fee installment or wallet top-up
     * @param {Object} details - { studentId, feeId, amountRupee, providerName, successUrl, failureUrl, isWalletTopUp }
     */
    async initiatePayment(details) {
        const { studentId, feeId, amountRupee, providerName, successUrl, failureUrl, isWalletTopUp = false } = details;

        // 1. Fetch Student/Parent details for checkout billing
        const [studentRows] = await this.db.query(
            `SELECT s.id, u.full_name, u.email 
             FROM students s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.id = ? LIMIT 1`,
            [studentId]
        );
        if (studentRows.length === 0) throw new Error(`Student ID ${studentId} not found.`);
        const student = studentRows[0];

        // 2. Generate secure idempotency key
        const idempotencyKey = crypto.createHash('sha256')
            .update(`${studentId}-${feeId || 'wallet'}-${amountRupee}-${Date.now()}`)
            .digest('hex');

        // 3. Resolve payment gateway provider
        const provider = this.getProvider(providerName);

        // 4. Create payment details params
        const metadata = {
            student_id: studentId.toString(),
            student_name: student.full_name,
            fee_id: feeId ? feeId.toString() : '',
            is_wallet_topup: isWalletTopUp ? 'true' : 'false'
        };

        const chargeParams = {
            amountRupee,
            currency: 'PKR',
            customerEmail: student.email || 'billing@school.edu.pk',
            customerName: student.full_name,
            metadata,
            successUrl,
            failureUrl
        };

        // 5. Invoke provider checkout creation
        const { providerIntentId, redirectUrl } = await provider.createPaymentIntent(chargeParams);

        // 6. Log payment intent in local database
        const intentDetails = {
            studentId,
            feeId: feeId || null,
            provider: providerName,
            providerIntentId,
            amountPaisa: Math.round(parseFloat(amountRupee) * 100),
            idempotencyKey
        };
        await this.paymentRepo.createPaymentIntent(intentDetails);

        return { providerIntentId, redirectUrl };
    }

    /**
     * Handle incoming payment gateway webhook callbacks securely
     */
    async handleWebhook(providerName, rawBody, headers, webhookSecret) {
        const provider = this.getProvider(providerName);

        // 1. VERIFY SIGNATURE (Non-negotiable)
        const isSignatureValid = await provider.verifyWebhookSignature(rawBody, headers, webhookSecret);
        if (!isSignatureValid) {
            throw new Error(`Invalid webhook signature callback received for provider: ${providerName}`);
        }

        // Parse payload securely
        const payload = JSON.parse(rawBody);
        
        // 2. EXTRACT STABLE EVENT ID & provider intent ID
        const normalized = provider.normalizeWebhookEvent(payload);
        const { eventId, type, providerIntentId, amountPaisa } = normalized;

        if (type !== 'charge.succeeded' || !providerIntentId) {
            console.log(`[WEBHOOK IGNORED] Event type '${type}' or missing intent ID.`);
            return;
        }

        // 3. LOG EVENT & DETECT DUPLICATES (Idempotency Check)
        // Log event first
        await this.paymentRepo.logWebhookEvent(eventId, providerName, payload);
        const loggedEvent = await this.paymentRepo.getWebhookEvent(eventId);

        if (loggedEvent && loggedEvent.processed) {
            console.log(`[WEBHOOK DUPLICATE] Event ${eventId} already processed. Skipping.`);
            return;
        }

        // 4. RESOLVE PAYMENT INTENT
        const intent = await this.paymentRepo.getPaymentIntent(providerName, providerIntentId);
        if (!intent) {
            throw new Error(`Orphan transaction: Payment intent ${providerIntentId} not found in database.`);
        }

        if (intent.status === 'succeeded') {
            console.log(`[WEBHOOK COMPLETED] Payment intent ${providerIntentId} already marked succeeded.`);
            // Update event processed just in case it wasn't marked
            const conn = await this.db.getConnection();
            try {
                await this.paymentRepo.markEventProcessed(conn, eventId);
            } finally {
                conn.release();
            }
            return;
        }

        // 5. TRANSACTION-SAFE EXECUTION
        const connection = await this.db.getConnection();
        try {
            await connection.beginTransaction();

            // Lock intent row FOR UPDATE
            const [intentRows] = await connection.query(
                'SELECT * FROM payment_intents WHERE id = ? FOR UPDATE',
                [intent.id]
            );
            const freshIntent = intentRows[0];

            if (freshIntent.status === 'succeeded') {
                await connection.commit();
                return;
            }

            // Update local intent status
            await this.paymentRepo.updateIntentStatus(connection, intent.id, 'succeeded');

            const isWalletTopUp = intent.fee_id === null;
            const amountRupees = parseFloat(intent.amount_paisa) / 100;

            if (isWalletTopUp) {
                // Wallet credit logic
                await this.walletRepo.topUp(
                    connection, 
                    intent.student_id, 
                    amountRupees, 
                    `Wallet Topup via Online Payment (${providerName.toUpperCase()})`,
                    intent.id
                );
                console.log(`[WALLET TOPUP SUCCESS] Student ID ${intent.student_id} credited Rs. ${amountRupees}`);
            } else {
                // Fee installment payment logic
                const receiptNo = `RCP-${Date.now()}`;
                
                // Retrieve campus_id from student record
                const [studs] = await connection.query('SELECT campus_id FROM students WHERE id = ?', [intent.student_id]);
                const campusId = studs.length > 0 ? studs[0].campus_id : 1;

                // Lock voucher record associated with student/fee
                const [vouchers] = await connection.query(
                    'SELECT * FROM vouchers WHERE student_id = ? AND academic_year = YEAR(CURRENT_DATE) FOR UPDATE',
                    [intent.student_id]
                );

                if (vouchers.length > 0) {
                    const voucher = vouchers[0];
                    // Insert record in fee_payments
                    await connection.query(
                        `INSERT INTO fee_payments (voucher_id, amount_paid, payment_method, receipt_no, recorded_by, fee_id, campus_id) 
                         VALUES (?, ?, ?, ?, 1, ?, ?)`,
                        [voucher.id, amountRupees, providerName.toUpperCase(), receiptNo, intent.fee_id, campusId]
                    );

                    // Recalculate totals
                    const newPaid = parseFloat(voucher.total_paid) + amountRupees;
                    const newBal = parseFloat(voucher.remaining_balance) - amountRupees;
                    await connection.query(
                        'UPDATE vouchers SET total_paid = ?, remaining_balance = ? WHERE id = ?',
                        [newPaid, newBal, voucher.id]
                    );

                    // Mark fee installment status as paid
                    await connection.query(
                        "UPDATE fees SET status = 'paid', paid_amount = paid_amount + ? WHERE id = ?",
                        [amountRupees, intent.fee_id]
                    );
                    
                    console.log(`[FEE PAYMENT SUCCESS] Voucher ID ${voucher.id} paid Rs. ${amountRupees}`);
                }
            }

            // Mark event processed
            await this.paymentRepo.markEventProcessed(connection, eventId);

            // Commit Transaction
            await connection.commit();
            console.log(`[TRANSACTION COMMITTED] Successfully processed payment event ${eventId}`);

        } catch (error) {
            await connection.rollback();
            console.error('[TRANSACTION ROLLBACK] Webhook execution error:', error.message);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = PaymentService;
