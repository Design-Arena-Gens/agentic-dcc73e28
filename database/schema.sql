CREATE TABLE IF NOT EXISTS wpcargo_shipments (
    ID BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_author BIGINT UNSIGNED DEFAULT 0,
    post_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    post_status VARCHAR(20) DEFAULT 'publish',
    post_title VARCHAR(255),
    post_content LONGTEXT,
    post_type VARCHAR(20) DEFAULT 'wpcargo_shipment'
);

CREATE TABLE IF NOT EXISTS wpcargo_postmeta (
    meta_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id BIGINT UNSIGNED NOT NULL,
    meta_key VARCHAR(255),
    meta_value LONGTEXT,
    KEY post_id (post_id),
    KEY meta_key (meta_key)
);

CREATE TABLE IF NOT EXISTS wp_lekya_cash_reconciliation (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    driver_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    note TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
