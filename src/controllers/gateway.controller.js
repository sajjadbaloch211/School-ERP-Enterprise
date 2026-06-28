/**
 * 🌐 Payment Gateway Controller
 * Mounts all routes for online payment checkout and webhook callbacks.
 *
 * Usage in server.js (BEFORE body-parser):
 *   require('./src/controllers/gateway.controller')(app, db, PaymentService);
 */

const PaymentService = require('../services/payment.service');

module.exports = function mountGatewayRoutes(app, db) {
    const paymentService = new PaymentService(db, process.env.STRIPE_SECRET_KEY || '');

    // ──────────────────────────────────────────────────────────
    // 1. WEBHOOK ENDPOINT — raw body required for signature check
    //    Must be mounted BEFORE bodyParser.json() in server.js
    // ──────────────────────────────────────────────────────────
    const express = require('express');
    const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

    app.post(
        '/payment/webhook/stripe',
        express.raw({ type: 'application/json' }), // Raw buffer preserved here
        async (req, res) => {
            // IMMEDIATELY respond 200 to avoid Stripe retry (process async)
            res.status(200).json({ received: true });

            try {
                const rawBody = req.body.toString('utf8'); // Buffer → string
                await paymentService.handleWebhook('stripe', rawBody, req.headers, WEBHOOK_SECRET);
            } catch (err) {
                console.error('[STRIPE WEBHOOK ERROR]', err.message);
            }
        }
    );

    // ──────────────────────────────────────────────────────────
    // 2. INITIATE CHECKOUT  (Admin triggers for parent payment link)
    // ──────────────────────────────────────────────────────────
    app.post('/payment/initiate', async (req, res) => {
        if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

        const { studentId, feeId, amountRupee, provider = 'stripe', isWalletTopUp = false } = req.body;

        if (!studentId || !amountRupee) {
            return res.status(400).json({ error: 'studentId and amountRupee are required.' });
        }

        try {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const { providerIntentId, redirectUrl } = await paymentService.initiatePayment({
                studentId: parseInt(studentId),
                feeId: feeId ? parseInt(feeId) : null,
                amountRupee: parseFloat(amountRupee),
                providerName: provider,
                isWalletTopUp: isWalletTopUp === true || isWalletTopUp === 'true',
                successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                failureUrl: `${baseUrl}/payment/cancel`
            });

            return res.json({ success: true, providerIntentId, redirectUrl });
        } catch (err) {
            console.error('[PAYMENT INITIATE ERROR]', err.message);
            return res.status(500).json({ error: err.message });
        }
    });

    // ──────────────────────────────────────────────────────────
    // 2b. STUDENT INITIATE CHECKOUT (Direct post from student portal)
    // ──────────────────────────────────────────────────────────
    app.post('/student/fees/pay/:id', async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'student') {
            return res.status(401).send("Unauthorized");
        }

        const feeId = req.params.id;

        try {
            // Find student ID linked to logged-in user
            const [students] = await db.query('SELECT id FROM students WHERE user_id = ?', [req.session.user.id]);
            if (!students.length) {
                return res.status(404).send("Student record not found.");
            }
            const studentId = students[0].id;

            // Fetch the fee record to ensure ownership and verify balance
            const [fees] = await db.query('SELECT * FROM fees WHERE id = ? AND student_id = ?', [feeId, studentId]);
            if (!fees.length) {
                return res.status(404).send("Fee record not found.");
            }
            const fee = fees[0];

            if (fee.status === 'paid') {
                return res.send("<script>alert('This installment is already paid!'); window.history.back();</script>");
            }

            const amountRupee = fee.remaining_amount > 0 ? fee.remaining_amount : fee.line_total;

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const { redirectUrl } = await paymentService.initiatePayment({
                studentId,
                feeId: parseInt(feeId),
                amountRupee: parseFloat(amountRupee),
                providerName: 'stripe',
                successUrl: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                failureUrl: `${baseUrl}/payment/cancel`
            });

            return res.redirect(redirectUrl);
        } catch (err) {
            console.error('[STUDENT PAYMENT INITIATE ERROR]', err.message);
            return res.status(500).send("Payment failed to initialize: " + err.message);
        }
    });

    // ──────────────────────────────────────────────────────────
    // 3. SUCCESS PAGE
    // ──────────────────────────────────────────────────────────
    app.get('/payment/success', (req, res) => {
        const sessionId = req.query.session_id || '';
        res.render('payment/success', {
            title: 'Payment Successful',
            sessionId,
            user: req.session.user || null
        });
    });

    // ──────────────────────────────────────────────────────────
    // 4. CANCEL / FAILURE PAGE
    // ──────────────────────────────────────────────────────────
    app.get('/payment/cancel', (req, res) => {
        res.render('payment/cancel', {
            title: 'Payment Cancelled',
            user: req.session.user || null
        });
    });
};
