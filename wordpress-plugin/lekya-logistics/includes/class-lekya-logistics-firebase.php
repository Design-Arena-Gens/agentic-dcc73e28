<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Firebase configuration handling for realtime driver telemetry.
 */
class Lekya_Logistics_Firebase {
    const OPTION_KEY = 'lekya_firebase_config';

    public static function init() {
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('rest_api_init', [__CLASS__, 'register_rest_fields']);
    }

    public static function register_settings() {
        register_setting('lekya_logistics_settings', self::OPTION_KEY);
        add_settings_section(
            'lekya_firebase_section',
            __('Firebase Realtime DB', 'lekya-logistics'),
            '__return_false',
            'lekya_logistics_settings'
        );
        add_settings_field(
            'lekya_firebase_payload',
            __('Firebase Config JSON', 'lekya-logistics'),
            [__CLASS__, 'render_config_field'],
            'lekya_logistics_settings',
            'lekya_firebase_section'
        );
    }

    public static function render_config_field() {
        $value = get_option(self::OPTION_KEY, '{}');
        echo '<textarea name="' . esc_attr(self::OPTION_KEY) . '" rows="8" cols="60" class="large-text code">' . esc_textarea($value) . '</textarea>';
        echo '<p class="description">' . esc_html__('Paste Firebase config JSON (apiKey, authDomain, databaseURL, etc.)', 'lekya-logistics') . '</p>';
    }

    public static function get_client_config() {
        $payload = get_option(self::OPTION_KEY, '{}');
        $decoded = json_decode($payload, true);
        if (!$decoded) {
            return [];
        }
        return array_intersect_key(
            $decoded,
            array_flip([
                'apiKey', 'authDomain', 'databaseURL', 'projectId',
                'storageBucket', 'messagingSenderId', 'appId',
            ])
        );
    }

    public static function register_rest_fields() {
        register_rest_route('lekya/v1', '/drivers/telemetry', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'handle_telemetry_update'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function handle_telemetry_update($request) {
        $driver_id = absint($request->get_param('driver_id'));
        $payload = $request->get_param('payload');

        if (!$driver_id || !is_array($payload)) {
            return new WP_Error('invalid_payload', __('Invalid driver telemetry payload.', 'lekya-logistics'), ['status' => 400]);
        }

        do_action('lekya_logistics_driver_telemetry', $driver_id, $payload);
        return ['status' => 'ok'];
    }
}
