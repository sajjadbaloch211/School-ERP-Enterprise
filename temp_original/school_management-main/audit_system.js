/**
 * 🔐 ENHANCED SECURITY AUDIT SYSTEM
 * Comprehensive logging with IP, device, browser, location tracking
 */

const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const requestIp = require('request-ip');
const crypto = require('crypto');

/**
 * Enhanced Security Event Logger
 * @param {Object} req - Express request object
 * @param {Object} user - User object (can be null for failed logins)
 * @param {String} action - Action type (LOGIN_SUCCESS, FAILED_LOGIN, CMS_PAGE_UPDATED, etc.)
 * @param {Object} details - Additional details (optional)
 */
function logSecurityEvent(req, user, action, details = {}) {
    // Extract IP Address
    const ip = requestIp.getClientIp(req) || req.ip || req.connection.remoteAddress || 'unknown';

    // Get location from IP (or from request body if GPS is available)
    let latitude = null;
    let longitude = null;
    let country = null;
    let city = null;

    // 1. Defaults: GeoIP lookup (Provides City/Country text even if GPS is used)
    const geo = geoip.lookup(ip);
    if (geo) {
        latitude = geo.ll[0];
        longitude = geo.ll[1];
        country = geo.country;
        city = geo.city;
    }

    // 2. Override: GPS coordinates from client (Higher Accuracy for Map)
    if (req.body && req.body.latitude && req.body.longitude) {
        latitude = parseFloat(req.body.latitude);
        longitude = parseFloat(req.body.longitude);

        // Only override text labels if client explicitly provided them
        if (req.body.country) country = req.body.country;
        if (req.body.city) city = req.body.city;
    }

    // Parse User Agent
    const parser = new UAParser(req.headers['user-agent']);
    const device = parser.getDevice().model || parser.getDevice().type || 'Desktop';
    const browser = `${parser.getBrowser().name || 'Unknown'} ${parser.getBrowser().version || ''}`.trim();
    const os = `${parser.getOS().name || 'Unknown'} ${parser.getOS().version || ''}`.trim();

    // Determine environment
    const environment = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

    // Calculate risk level
    let riskLevel = 'Low';
    if (action.includes('FAILED') || action.includes('BLOCKED')) {
        riskLevel = 'High';
    } else if (action.includes('DELETE') || action.includes('ROLLBACK')) {
        riskLevel = 'Medium';
    }

    // Create integrity hash (tamper-proof)
    const integrityData = `${user ? user.id : 'null'}|${action}|${ip}|${Date.now()}|${process.env.SESSION_SECRET || 'secret'}`;
    const integrityHash = crypto.createHash('sha256').update(integrityData).digest('hex');

    // Prepare audit log entry
    const auditEntry = {
        campus_id: req.session.campus ? req.session.campus.id : 1,
        user_id: user ? user.id : null,
        role: user ? user.role : null,
        action: action,
        ip_address: ip,
        latitude: latitude,
        longitude: longitude,
        country: country,
        city: city,
        device: device,
        browser: browser,
        os: os,
        environment: environment,
        risk_level: riskLevel,
        integrity_hash: integrityHash,
        action_details: JSON.stringify(details)
    };

    // Insert into database
    const query = `INSERT INTO audit_logs 
                   (campus_id, user_id, role, action, ip_address, latitude, longitude, country, city, 
                    device, browser, os, environment, risk_level, integrity_hash, action_details) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        auditEntry.campus_id,
        auditEntry.user_id,
        auditEntry.role,
        auditEntry.action,
        auditEntry.ip_address,
        auditEntry.latitude,
        auditEntry.longitude,
        auditEntry.country,
        auditEntry.city,
        auditEntry.device,
        auditEntry.browser,
        auditEntry.os,
        auditEntry.environment,
        auditEntry.risk_level,
        auditEntry.integrity_hash,
        auditEntry.action_details
    ];

    // Use global db connection (will be passed from server.js)
    if (global.db) {
        global.db.query(query, values, (err) => {
            if (err) {
                console.error('❌ Audit Log Error:', err.message);
            }
        });
    }

    // Console log for development
    if (environment === 'dev') {
        console.log(`🔐 [AUDIT] ${action} | User: ${user ? user.username : 'N/A'} | IP: ${ip} | Location: ${city || 'Unknown'}, ${country || 'Unknown'}`);
    }
}

/**
 * Verify Audit Log Integrity
 * @param {Object} logEntry - Audit log entry from database
 * @returns {Boolean} - True if integrity is valid
 */
function verifyAuditIntegrity(logEntry) {
    const integrityData = `${logEntry.user_id || 'null'}|${logEntry.action}|${logEntry.ip_address}|${new Date(logEntry.created_at).getTime()}|${process.env.SESSION_SECRET || 'secret'}`;
    const calculatedHash = crypto.createHash('sha256').update(integrityData).digest('hex');

    return calculatedHash === logEntry.integrity_hash;
}

/**
 * Get Audit Logs with Filters (Super Admin Only)
 * @param {Object} filters - { user_id, action, start_date, end_date, risk_level }
 * @param {Function} callback - Callback function
 */
function getAuditLogs(filters = {}, callback) {
    let query = `SELECT a.*, u.username, u.full_name 
                 FROM audit_logs a 
                 LEFT JOIN users u ON a.user_id = u.id 
                 WHERE 1=1`;

    const params = [];

    if (filters.user_id) {
        query += ' AND a.user_id = ?';
        params.push(filters.user_id);
    }

    if (filters.action) {
        query += ' AND a.action LIKE ?';
        params.push(`%${filters.action}%`);
    }

    if (filters.start_date) {
        query += ' AND a.created_at >= ?';
        params.push(filters.start_date);
    }

    if (filters.end_date) {
        query += ' AND a.created_at <= ?';
        params.push(filters.end_date);
    }

    if (filters.risk_level) {
        query += ' AND a.risk_level = ?';
        params.push(filters.risk_level);
    }

    query += ' ORDER BY a.created_at DESC LIMIT 1000';

    if (global.db) {
        global.db.query(query, params, (err, results) => {
            if (err) {
                console.error('❌ Get Audit Logs Error:', err.message);
                return callback([]);
            }
            callback(results);
        });
    } else {
        callback([]);
    }
}

/**
 * Export Audit Logs to CSV (Super Admin Only)
 * @param {Object} filters - Same as getAuditLogs
 * @param {Function} callback - Returns CSV string
 */
function exportAuditLogsCSV(filters = {}, callback) {
    getAuditLogs(filters, (logs) => {
        if (logs.length === 0) {
            return callback('No logs found');
        }

        // CSV Header
        let csv = 'ID,Date/Time,User,Role,Action,IP Address,Country,City,Device,Browser,OS,Risk Level\n';

        // CSV Rows
        logs.forEach(log => {
            csv += `${log.id},"${log.created_at}","${log.username || 'N/A'}","${log.role || 'N/A'}","${log.action}","${log.ip_address}","${log.country || 'N/A'}","${log.city || 'N/A'}","${log.device}","${log.browser}","${log.os}","${log.risk_level}"\n`;
        });

        callback(csv);
    });
}

module.exports = {
    logSecurityEvent,
    verifyAuditIntegrity,
    getAuditLogs,
    exportAuditLogsCSV
};
