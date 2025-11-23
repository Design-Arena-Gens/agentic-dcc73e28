# Lekya Logistics Platform

Full-stack delivery management system for order automation, live tracking, and cash reconciliation.

## Stack Overview

- **WordPress Plugin** (`wordpress-plugin/lekya-logistics/`): Extends WPCargo with assignment workflows, cash reconciliation, Firebase telemetry ingestion, and notification bridges for WhatsApp Business + SMS.
- **Driver Mobile App** (`driver-app/`): Expo/React Native Android app for drivers to manage tasks, scan packages, and sync GPS telemetry to Firebase Realtime Database.
- **Database** (`database/schema.sql`): Baseline schema migrations for custom tables (cash reconciliation) alongside WPCargo shipments.

## WordPress Plugin

- Adds `Logistics Manager` capability-scoped dashboard with real-time order and driver visibility.
- Assignment UI writes to WPCargo shipments via custom REST endpoints (`/wp-json/lekya/v1/...`).
- Firebase settings store client config; Leaflet map renders live driver markers sourced from Firebase RTDB.
- Notification settings integrate WhatsApp Business API + SMS gateway; hooks fire on order assignment and status updates.
- Driver REST surface exposes assigned orders + status mutation endpoints for the mobile app.

### Installation
1. Copy `wordpress-plugin/lekya-logistics` into `wp-content/plugins/`.
2. Activate **Lekya Logistics Manager** in wp-admin.
3. Configure Firebase + notification credentials in *Logistics → Integrations*.
4. Ensure WPCargo and JWT Auth plugins are active; create users with `Driver` role.

## Driver App (Expo)

### Environment
Create `driver-app/.env` based on `.env.example`:
```
EXPO_PUBLIC_API_BASE=https://your-wordpress-site.com/wp-json/lekya/v1
EXPO_PUBLIC_FIREBASE_CONFIG={"apiKey":"","authDomain":"","databaseURL":"","projectId":"","storageBucket":"","messagingSenderId":"","appId":""}
```

### Commands
```bash
cd driver-app
npm install
npm run android    # build & deploy to device/emulator
npm test           # Jest + Testing Library
```

### Features
- Secure driver login via WordPress JWT.
- Assigned orders list with workflow controls: Accept → Picked Up → In Transit → Delivered/Returned.
- Barcode scanning (Expo BarcodeScanner) persists to WordPress shipment metadata.
- Background GPS publishing to Firebase (15s/20m cadence) using Expo Location.

## Cash Reconciliation Table

The plugin provisions `wp_lekya_cash_reconciliation` on activation. For manual setup or migrations, use `database/schema.sql`.

## Deployment

1. Verify plugin within a WordPress environment (PHP 8.1+, MySQL 5.7+).
2. Build the Expo app for Android with EAS or `expo run:android`.
3. Configure WhatsApp Business + SMS providers via the Integrations panel.

## Notes

- Admin dashboard depends on Leaflet CDN and Firebase SDK loaded via wp-admin.
- Ensure REST API is HTTPS accessible for driver devices.
