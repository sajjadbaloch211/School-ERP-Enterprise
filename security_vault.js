const crypto = require('crypto');
const speakeasy = require('speakeasy');

// 🔒 ENTERPRISE SECURITY CONFIG
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '64_char_hex_key_for_aes_256_encryption_seed'; // 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16 bytes

/**
 * 🔒 DATA ENCRYPTION (AES-256-CBC)
 * Mitigates: Database Leaks / Data Theft
 */
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error('[SECURITY VAULT] Decryption Failed');
        return null;
    }
}

/**
 * 🔒 MULTI-FACTOR AUTHENTICATION (TOTP)
 * Mitigates: Phishing / Password Theft
 */
function generateMFA(username) {
    return speakeasy.generateSecret({
        name: `WaqarSchool:${username}`
    });
}

function verifyMFAToken(token, secret) {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 30s drift
    });
}

/**
 * 🔒 SESSION FINGERPRINTING
 * Mitigates: Session Hijacking
 */
function generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || 'unknown';
    const acceptLanguage = req.headers['accept-language'] || 'unknown';
    const ip = req.ip || '0.0.0.0';

    return crypto.createHash('sha256')
        .update(userAgent + acceptLanguage + ip)
        .digest('hex');
}

module.exports = {
    encrypt,
    decrypt,
    generateMFA,
    verifyMFAToken,
    generateDeviceFingerprint
};
