<?php
if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap lekya-logistics">
    <h1><?php esc_html_e('Lekya Logistics Control Center', 'lekya-logistics'); ?></h1>
    <div id="lekya-app">
        <div class="lekya-panels">
            <section class="lekya-panel">
                <header>
                    <h2><?php esc_html_e('Active Orders', 'lekya-logistics'); ?></h2>
                    <button class="button button-secondary" data-action="refresh-orders"><?php esc_html_e('Refresh', 'lekya-logistics'); ?></button>
                </header>
                <ul class="lekya-order-list" data-role="orders"></ul>
            </section>
            <section class="lekya-panel">
                <header>
                    <h2><?php esc_html_e('Drivers', 'lekya-logistics'); ?></h2>
                    <button class="button button-secondary" data-action="refresh-drivers"><?php esc_html_e('Refresh', 'lekya-logistics'); ?></button>
                </header>
                <ul class="lekya-driver-list" data-role="drivers"></ul>
            </section>
            <section class="lekya-panel">
                <header>
                    <h2><?php esc_html_e('Cash Reconciliation', 'lekya-logistics'); ?></h2>
                    <button class="button button-secondary" data-action="refresh-cash"><?php esc_html_e('Refresh', 'lekya-logistics'); ?></button>
                </header>
                <table class="lekya-table" data-role="cash">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Driver', 'lekya-logistics'); ?></th>
                            <th><?php esc_html_e('Amount', 'lekya-logistics'); ?></th>
                            <th><?php esc_html_e('Status', 'lekya-logistics'); ?></th>
                            <th><?php esc_html_e('Note', 'lekya-logistics'); ?></th>
                            <th><?php esc_html_e('Date', 'lekya-logistics'); ?></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </section>
        </div>
        <section class="lekya-panel lekya-map-panel">
            <header>
                <h2><?php esc_html_e('Live Driver Map', 'lekya-logistics'); ?></h2>
            </header>
            <div id="lekya-map" class="lekya-map"></div>
        </section>
        <section class="lekya-panel">
            <header>
                <h2><?php esc_html_e('Integrations', 'lekya-logistics'); ?></h2>
            </header>
            <form method="post" action="options.php">
                <?php
                settings_fields('lekya_logistics_settings');
                do_settings_sections('lekya_logistics_settings');
                submit_button(__('Save Settings', 'lekya-logistics'));
                ?>
            </form>
        </section>
    </div>
</div>
