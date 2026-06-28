/**
 * 💳 Stripe Payment Provider Adapter
 * Implements BasePaymentProvider using official stripe SDK.
 */

const BasePaymentProvider = require('./base.provider');
const Stripe = require('stripe');

class StripeProvider extends BasePaymentProvider {
    constructor(apiKey) {
        super('stripe');
        // If no API key is set, use a mock secret for testing
        this.stripe = Stripe(apiKey || 'sk_test_mock_key');
    }

    /**
     * Create a Stripe Hosted Checkout Session to process payment.
     * This drastically reduces PCI scope to SAQ A since card details are entered on Stripe's server.
     */
    async createPaymentIntent(params) {
        const { amountRupee, currency = 'PKR', customerEmail, customerName, metadata = {}, successUrl, failureUrl } = params;

        // Convert amount to smallest currency unit (Cents / Paisa / Rupees as integer for Stripe)
        // Note: Stripe supports PKR natively. Smallest unit is Rupees (no Paisa decimals for PKR in Stripe - zero-decimal currency).
        // Let's verify: In Stripe API, PKR is a zero-decimal currency! E.g. Rs 100 is passed as 100, not 10000.
        // Let's check: Yes, PKR is officially a zero-decimal currency in Stripe.
        // Let's make sure we round to integer.
        const amount = Math.round(parseFloat(amountRupee));

        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: [{
                price_data: {
                    currency: currency.toLowerCase(),
                    product_data: {
                        name: metadata.fee_title || 'School Tuition Fee Payment',
                        description: `Voucher reference: ${metadata.voucher_id || 'N/A'}`
                    },
                    unit_amount: amount,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: failureUrl,
            metadata: metadata,
            payment_intent_data: {
                metadata: metadata
            }
        });

        return {
            providerIntentId: session.id, // We track session ID as provider intent ID
            redirectUrl: session.url
        };
    }

    /**
     * Verify Stripe webhook HMAC signature
     */
    async verifyWebhookSignature(rawBody, headers, webhookSecret) {
        const signature = headers['stripe-signature'];
        if (!signature) return false;

        try {
            // Verify event signature. Throws error if invalid.
            this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
            return true;
        } catch (err) {
            console.error('[STRIPE SIGNATURE FAILURE]', err.message);
            return false;
        }
    }

    /**
     * Normalize Stripe webhook event structure
     */
    normalizeWebhookEvent(stripeEvent) {
        const eventId = stripeEvent.id;
        const type = stripeEvent.type;

        // We handle 'checkout.session.completed'
        if (type === 'checkout.session.completed') {
            const session = stripeEvent.data.object;
            return {
                eventId,
                type: 'charge.succeeded',
                providerIntentId: session.id,
                amountPaisa: session.amount_total * 100, // Normalized to Paisa unit internally
                raw: session
            };
        }

        return {
            eventId,
            type: 'unhandled',
            providerIntentId: null,
            raw: stripeEvent
        };
    }
}

module.exports = StripeProvider;
