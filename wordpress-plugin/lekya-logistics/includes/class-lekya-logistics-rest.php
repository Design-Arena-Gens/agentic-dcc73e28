<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Custom REST endpoints for logistics operations.
 */
class Lekya_Logistics_REST {
    public static function init() {
        add_action('rest_api_init', [__CLASS__, 'register_routes']);
    }

    public static function register_routes() {
        register_rest_route('lekya/v1', '/orders', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_orders'],
            'permission_callback' => [__CLASS__, 'can_manage'],
        ]);

        register_rest_route('lekya/v1', '/orders/(?P<id>\d+)/assign', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'assign_order'],
            'permission_callback' => [__CLASS__, 'can_manage'],
            'args' => [
                'driver_id' => [
                    'required' => true,
                    'type' => 'integer',
                ],
            ],
        ]);

        register_rest_route('lekya/v1', '/drivers', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_drivers'],
            'permission_callback' => [__CLASS__, 'can_manage'],
        ]);

        register_rest_route('lekya/v1', '/orders/assigned', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_assigned_orders'],
            'permission_callback' => [__CLASS__, 'is_driver'],
        ]);

        register_rest_route('lekya/v1', '/orders/(?P<id>\d+)/status', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'update_status'],
            'permission_callback' => [__CLASS__, 'is_driver'],
            'args' => [
                'status' => [
                    'required' => true,
                    'type' => 'string',
                ],
                'cod_amount' => [
                    'required' => false,
                ],
            ],
        ]);

        register_rest_route('lekya/v1', '/cash', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'get_cash_reports'],
            'permission_callback' => [__CLASS__, 'can_manage'],
        ]);

        register_rest_route('lekya/v1', '/cash', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'create_cash_report'],
            'permission_callback' => [__CLASS__, 'can_manage'],
        ]);
    }

    public static function can_manage() {
        return current_user_can(Lekya_Logistics_Admin::CAP_MANAGE);
    }

    public static function is_driver() {
        return current_user_can('lekya_driver') || current_user_can(Lekya_Logistics_Admin::CAP_MANAGE);
    }

    public static function get_orders(WP_REST_Request $request) {
        $args = [
            'post_type' => 'wpcargo_shipment',
            'post_status' => 'publish',
            'numberposts' => 100,
        ];
        $posts = get_posts($args);

        $orders = array_map(function ($post) {
            return [
                'id' => $post->ID,
                'title' => $post->post_title,
                'status' => get_post_meta($post->ID, 'wpcargo_status', true),
                'driver_id' => intval(get_post_meta($post->ID, '_lekya_driver_id', true)),
                'pickup_address' => get_post_meta($post->ID, 'wpcargo_pickup_address', true),
                'delivery_address' => get_post_meta($post->ID, 'wpcargo_delivery_address', true),
                'cod_amount' => floatval(get_post_meta($post->ID, 'wpcargo_cod', true)),
            ];
        }, $posts);

        return ['orders' => $orders];
    }

    public static function assign_order(WP_REST_Request $request) {
        $order_id = absint($request->get_param('id'));
        $driver_id = absint($request->get_param('driver_id'));

        if (!$order_id || !$driver_id) {
            return new WP_Error('invalid_request', __('Invalid order assignment payload', 'lekya-logistics'), ['status' => 400]);
        }

        update_post_meta($order_id, '_lekya_driver_id', $driver_id);
        do_action('lekya_logistics_order_assigned', $order_id, $driver_id);

        return ['status' => 'assigned'];
    }

    public static function get_drivers() {
        $users = get_users([
            'role__in' => ['lekya_driver'],
            'fields' => ['ID', 'display_name', 'user_email'],
        ]);

        $drivers = array_map(function ($user) {
            return [
                'id' => $user->ID,
                'name' => $user->display_name,
                'email' => $user->user_email,
                'phone' => get_user_meta($user->ID, 'phone_number', true),
            ];
        }, $users);

        return ['drivers' => $drivers];
    }

    public static function get_cash_reports() {
        global $wpdb;
        $table = $wpdb->prefix . 'lekya_cash_reconciliation';
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 100", ARRAY_A);
        return ['reports' => array_map([__CLASS__, 'format_cash_row'], $rows)];
    }

    public static function create_cash_report(WP_REST_Request $request) {
        global $wpdb;
        $table = $wpdb->prefix . 'lekya_cash_reconciliation';
        $driver_id = absint($request->get_param('driver_id'));
        $amount = floatval($request->get_param('amount'));
        $status = sanitize_text_field($request->get_param('status') ?: 'pending');
        $note = sanitize_textarea_field($request->get_param('note') ?: '');

        if (!$driver_id || $amount <= 0) {
            return new WP_Error('invalid_request', __('Invalid cash payload', 'lekya-logistics'), ['status' => 400]);
        }

        $wpdb->insert($table, [
            'driver_id' => $driver_id,
            'amount' => $amount,
            'status' => $status,
            'note' => $note,
            'created_at' => current_time('mysql', true),
        ]);

        return ['status' => 'recorded'];
    }

    public static function get_assigned_orders() {
        $current_user_id = get_current_user_id();
        if (!$current_user_id) {
            return new WP_Error('unauthenticated', __('Authentication required', 'lekya-logistics'), ['status' => 401]);
        }
        $args = [
            'post_type' => 'wpcargo_shipment',
            'post_status' => 'publish',
            'meta_key' => '_lekya_driver_id',
            'meta_value' => $current_user_id,
            'numberposts' => 100,
        ];
        $posts = get_posts($args);
        $orders = array_map(function ($post) {
            return [
                'id' => $post->ID,
                'title' => $post->post_title,
                'status' => get_post_meta($post->ID, 'wpcargo_status', true),
                'pickup_address' => get_post_meta($post->ID, 'wpcargo_pickup_address', true),
                'delivery_address' => get_post_meta($post->ID, 'wpcargo_delivery_address', true),
                'cod_amount' => floatval(get_post_meta($post->ID, 'wpcargo_cod', true)),
                'barcode' => get_post_meta($post->ID, '_lekya_barcode', true),
            ];
        }, $posts);

        return ['orders' => $orders];
    }

    public static function update_status(WP_REST_Request $request) {
        $order_id = absint($request->get_param('id'));
        $status = sanitize_text_field($request->get_param('status'));
        $cod_amount = $request->get_param('cod_amount');
        $user_id = get_current_user_id();
        $barcode = $request->get_param('barcode');

        if (!$order_id || !$user_id) {
            return new WP_Error('invalid_request', __('Order or user missing', 'lekya-logistics'), ['status' => 400]);
        }

        $assigned_driver = intval(get_post_meta($order_id, '_lekya_driver_id', true));
        if ($assigned_driver && $assigned_driver !== $user_id && !current_user_can(Lekya_Logistics_Admin::CAP_MANAGE)) {
            return new WP_Error('forbidden', __('Order assigned to another driver', 'lekya-logistics'), ['status' => 403]);
        }

        update_post_meta($order_id, 'wpcargo_status', $status);
        if ($cod_amount !== null) {
            update_post_meta($order_id, 'wpcargo_cod', floatval($cod_amount));
        }

        if ($barcode !== null) {
            update_post_meta($order_id, '_lekya_barcode', sanitize_text_field($barcode));
        }

        do_action('lekya_logistics_status_updated', $order_id, $status, $user_id);
        return ['status' => 'updated'];
    }

    private static function format_cash_row($row) {
        return [
            'id' => intval($row['id']),
            'driver_id' => intval($row['driver_id']),
            'amount' => floatval($row['amount']),
            'status' => sanitize_text_field($row['status']),
            'note' => sanitize_textarea_field($row['note']),
            'created_at' => $row['created_at'],
        ];
    }
}
