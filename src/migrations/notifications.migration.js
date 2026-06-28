/**
 * 🔔 Notification Table Migration
 * Creates the notifications table for the in-app alert system.
 * Safe to run multiple times (IF NOT EXISTS).
 */

async function migrateNotifications(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            campus_id INT DEFAULT 1,
            type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
            title VARCHAR(150) NOT NULL,
            message TEXT NOT NULL,
            link VARCHAR(255) DEFAULT NULL,
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_read (user_id, is_read),
            INDEX idx_campus_created (campus_id, created_at),
            FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='In-app notification feed'
    `);
    console.log('✓ notifications table ready.');
}

module.exports = migrateNotifications;
