<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Notification bridge to WhatsApp Business and SMS gateway.
 */
class Lekya_Logistics_Notifications {
    const OPTION_KEY = 'lekya_notification_config';

    public static function init() {
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('lekya_logistics_order_assigned', [__CLASS__, 'handle_assignment'], 10, 2);
        add_action('lekya_logistics_status_updated', [__CLASS__, 'handle_status_update'], 10, 3);
    }

    public static function register_settings() {
        register_setting('lekya_logistics_settings', self::OPTION_KEY);
        add_settings_section(
            'lekya_notifications_section',
            __('Notifications', 'lekya-logistics'),
            '__return_false',
            'lekya_logistics_settings'
        );
        add_settings_field(
            'lekya_notifications_payload',
            __('WhatsApp & SMS Config', 'lekya-logistics'),
            [__CLASS__, 'render_field'],
            'lekya_logistics_settings',
            'lekya_notifications_section'
        );
    }

    public static function render_field() {
        $value = get_option(self::OPTION_KEY, [
            'whatsapp_api_url' => '',
            'whatsapp_token' => '',
            'sms_api_url' => '',
            'sms_api_key' => '',
        ]);
        if (!is_array($value)) {
            $value = [];
        }
        $whatsapp_url = esc_url($value['whatsapp_api_url'] ?? '');
        $whatsapp_token = esc_attr($value['whatsapp_token'] ?? '');
        $sms_url = esc_url($value['sms_api_url'] ?? '');
        $sms_key = esc_attr($value['sms_api_key'] ?? '');

        echo '<label>' . esc_html__('WhatsApp API URL', 'lekya-logistics') . '</label>';
        echo '<input type="url" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[whatsapp_api_url]" value="' . $whatsapp_url . '"/>';
        echo '<br>';
        echo '<label>' . esc_html__('WhatsApp Token', 'lekya-logistics') . '</label>';
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[whatsapp_token]" value="' . $whatsapp_token . '"/>';
        echo '<p class="description">' . esc_html__('Bearer token or API key for WhatsApp Business provider.', 'lekya-logistics') . '</p>';

        echo '<label>' . esc_html__('SMS API URL', 'lekya-logistics') . '</label>';
        echo '<input type="url" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[sms_api_url]" value="' . $sms_url . '"/>';
        echo '<br>';
        echo '<label>' . esc_html__('SMS API Key', 'lekya-logistics') . '</label>';
        echo '<input type="text" class="regular-text" name="' . esc_attr(self::OPTION_KEY) . '[sms_api_key]" value="' . $sms_key . '"/>';
        echo '<p class="description">' . esc_html__('API key for OTP SMS gateway.', 'lekya-logistics') . '</p>';
    }

    public static function handle_assignment($order_id, $driver_id) {
        $driver_phone = get_user_meta($driver_id, 'phone_number', true);
        $driver_name = get_the_author_meta('display_name', $driver_id);
        $order_title = get_the_title($order_id);
        $message = sprintf(
            __('New order assigned: %s. Please review your tasks in the app.', 'lekya-logistics'),
            $order_title
        );
        if ($driver_phone) {
            self::send_whatsapp($driver_phone, $message);
        }
        do_action('lekya_notifications_assignment', $order_id, $driver_id);
    }

    public static function handle_status_update($order_id, $status, $driver_id) {
        $customer_phone = get_post_meta($order_id, 'wpcargo_contact_number', true);
        if (!$customer_phone) {
            return;
        }
        $message = sprintf(
            __('Your delivery #%d is now %s.', 'lekya-logistics'),
            $order_id,
            $status
        );
        self::send_sms($customer_phone, $message);
    }

    private static function send_whatsapp($to, $message) {
        $config = get_option(self::OPTION_KEY, []);
        if (empty($config['whatsapp_api_url']) || empty($config['whatsapp_token'])) {
            return;
        }
        wp_remote_post($config['whatsapp_api_url'], [
            'headers' => [
                'Authorization' => 'Bearer ' . $config['whatsapp_token'],
                'Content-Type' => 'application/json',
            ],
            'body' => wp_json_encode([
                'to' => $to,
                'type' => 'template',
                'template' => [
                    'name' => 'lekya_assignment',
                    'language' => ['code' => 'en'],
                    'components' => [
                        ['type' => 'body', 'parameters' => [['type' => 'text', 'text' => $message]]],
                    ],
                ],
            ]),
            'timeout' => 10,
        ]);
    }

    private static function send_sms($to, $message) {
        $config = get_option(self::OPTION_KEY, []);
        if (empty($config['sms_api_url']) || empty($config['sms_api_key'])) {
            return;
        }
        wp_remote_post($config['sms_api_url'], [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $config['sms_api_key'],
            ],
            'body' => wp_json_encode([
                'to' => $to,
                'message' => $message,
            ]),
            'timeout' => 10,
        ]);
    }
}
