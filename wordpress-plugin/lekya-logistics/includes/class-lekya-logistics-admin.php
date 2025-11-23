<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin UX helpers and custom roles.
 */
class Lekya_Logistics_Admin {
    const ROLE_MANAGER = 'lekya_logistics_manager';
    const CAP_MANAGE = 'manage_lekya_logistics';

    public static function init() {
        add_action('init', [__CLASS__, 'register_role']);
        add_filter('wpcargo_shipment_metaboxes', [__CLASS__, 'filter_shipment_metaboxes']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'enqueue_assets']);
        add_action('admin_menu', [__CLASS__, 'register_menu'], 40);
        add_action('wp_ajax_lekya_assign_driver', [__CLASS__, 'handle_assign_driver']);
        add_action('wp_ajax_lekya_cash_update', [__CLASS__, 'handle_cash_update']);
    }

    public static function register_role() {
        if (!get_role(self::ROLE_MANAGER)) {
            add_role(
                self::ROLE_MANAGER,
                __('Logistics Manager', 'lekya-logistics'),
                [
                    'read' => true,
                    self::CAP_MANAGE => true,
                    'manage_options' => false,
                    'wpcargo_manage_shipments' => true,
                    'edit_posts' => false,
                    'list_users' => true,
                ]
            );
        } else {
            $role = get_role(self::ROLE_MANAGER);
            if ($role && !$role->has_cap(self::CAP_MANAGE)) {
                $role->add_cap(self::CAP_MANAGE);
            }
        }
        if (!get_role('lekya_driver')) {
            add_role(
                'lekya_driver',
                __('Driver', 'lekya-logistics'),
                [
                    'read' => true,
                    'edit_posts' => false,
                ]
            );
        }
    }

    public static function filter_shipment_metaboxes($metaboxes) {
        if (!current_user_can(self::CAP_MANAGE)) {
            return $metaboxes;
        }
        unset($metaboxes['wpcargo-import-export']);
        unset($metaboxes['wpcargo-settings']);
        return $metaboxes;
    }

    public static function enqueue_assets($hook) {
        if (strpos($hook, 'lekya-logistics') === false) {
            return;
        }
        $base_file = dirname(__FILE__, 2) . '/lekya-logistics.php';
        wp_enqueue_style(
            'lekya-logistics-admin',
            plugins_url('assets/admin.css', $base_file),
            [],
            '1.0.0'
        );
        wp_enqueue_script(
            'lekya-logistics-admin',
            plugins_url('assets/admin.js', $base_file),
            ['jquery'],
            '1.0.0',
            true
        );
        wp_localize_script('lekya-logistics-admin', 'LekyaConfig', [
            'nonce' => wp_create_nonce('lekya-logistics'),
            'firebaseConfig' => Lekya_Logistics_Firebase::get_client_config(),
            'restBase' => esc_url_raw(rest_url('lekya/v1')),
        ]);
    }

    public static function register_menu() {
        add_menu_page(
            __('Lekya Logistics', 'lekya-logistics'),
            __('Logistics', 'lekya-logistics'),
            self::CAP_MANAGE,
            'lekya-logistics-dashboard',
            [__CLASS__, 'render_dashboard'],
            'dashicons-location-alt',
            26
        );
    }

    public static function render_dashboard() {
        include plugin_dir_path(__FILE__) . '../templates/dashboard.php';
    }

    public static function handle_assign_driver() {
        check_ajax_referer('lekya-logistics', 'nonce');
        if (!current_user_can(self::CAP_MANAGE)) {
            wp_send_json_error(['message' => __('Unauthorized', 'lekya-logistics')], 403);
        }
        $shipment_id = absint($_POST['shipment_id'] ?? 0);
        $driver_id = absint($_POST['driver_id'] ?? 0);

        if (!$shipment_id || !$driver_id) {
            wp_send_json_error(['message' => __('Missing data', 'lekya-logistics')], 400);
        }

        update_post_meta($shipment_id, '_lekya_driver_id', $driver_id);
        wp_send_json_success(['message' => __('Driver assigned', 'lekya-logistics')]);
    }

    public static function handle_cash_update() {
        check_ajax_referer('lekya-logistics', 'nonce');
        if (!current_user_can(self::CAP_MANAGE)) {
            wp_send_json_error(['message' => __('Unauthorized', 'lekya-logistics')], 403);
        }

        $driver_id = absint($_POST['driver_id'] ?? 0);
        $amount = floatval($_POST['amount'] ?? 0);
        $status = sanitize_text_field($_POST['status'] ?? 'pending');
        $note = sanitize_textarea_field($_POST['note'] ?? '');

        if (!$driver_id || !$amount) {
            wp_send_json_error(['message' => __('Invalid payload', 'lekya-logistics')], 400);
        }

        global $wpdb;
        $table = $wpdb->prefix . 'lekya_cash_reconciliation';
        $wpdb->insert($table, [
            'driver_id' => $driver_id,
            'amount' => $amount,
            'status' => $status,
            'note' => $note,
            'created_at' => current_time('mysql', true),
        ]);

        wp_send_json_success(['message' => __('Cash updated', 'lekya-logistics')]);
    }
}
