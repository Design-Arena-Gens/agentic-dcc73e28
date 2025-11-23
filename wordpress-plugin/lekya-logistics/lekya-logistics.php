<?php
/**
 * Plugin Name: Lekya Logistics Manager
 * Description: Custom logistics management layer integrating WPCargo assignment, live driver tracking, and cash reconciliation workflows.
 * Version: 1.0.0
 * Author: Lekya Logistics
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once plugin_dir_path(__FILE__) . 'includes/class-lekya-logistics-rest.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-lekya-logistics-admin.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-lekya-logistics-firebase.php';
require_once plugin_dir_path(__FILE__) . 'includes/class-lekya-logistics-notifications.php';

/**
 * Bootstrap plugin subsystems.
 */
function lekya_logistics_bootstrap() {
    Lekya_Logistics_Admin::init();
    Lekya_Logistics_REST::init();
    Lekya_Logistics_Firebase::init();
    Lekya_Logistics_Notifications::init();
}

add_action('plugins_loaded', 'lekya_logistics_bootstrap');

/**
 * Install routine.
 */
function lekya_logistics_install() {
    global $wpdb;
    $table = $wpdb->prefix . 'lekya_cash_reconciliation';
    $charset_collate = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE {$table} (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        driver_id BIGINT UNSIGNED NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        note TEXT NULL,
        created_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        KEY driver_id (driver_id)
    ) {$charset_collate};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
}

register_activation_hook(__FILE__, 'lekya_logistics_install');
