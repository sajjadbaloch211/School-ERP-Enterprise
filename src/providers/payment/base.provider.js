/**
 * 🧱 Base Payment Provider Interface
 * All payment gateway adapters (Stripe, JazzCash, Easypaisa, PayFast) must extend this class
 * and implement its abstract methods.
 */

class BasePaymentProvider {
    constructor(name) {
        this.name = name; // e.g. 'stripe', 'jazzcash'
    }

    /**
     * Initiate a payment and return redirect/app link details
     * @param {Object} params - { amountRupee, currency, customerEmail, customerName, metadata }
     * @returns {Promise<Object>} - { providerIntentId, redirectUrl }
     */
    async createPaymentIntent(params) {
        throw new Error('Method "createPaymentIntent" must be implemented by the provider.');
    }

    /**
     * Verify incoming webhook request signature
     * @param {string} rawBody - Raw HTTP request body string
     * @param {Object} headers - HTTP request headers
     * @param {string} webhookSecret - Signature verification secret key
     * @returns {Promise<boolean>}
     */
    async verifyWebhookSignature(rawBody, headers, webhookSecret) {
        throw new Error('Method "verifyWebhookSignature" must be implemented by the provider.');
    }

    /**
     * Normalize webhook payload into a standard unified format
     * @param {Object} rawPayload - Parsed webhook payload
     * @returns {Object} - { eventId, type: 'charge.succeeded'|'charge.failed', providerIntentId, amountPaisa, raw }
     */
    normalizeWebhookEvent(rawPayload) {
        throw new Error('Method "normalizeWebhookEvent" must be implemented by the provider.');
    }
}

module.exports = BasePaymentProvider;
