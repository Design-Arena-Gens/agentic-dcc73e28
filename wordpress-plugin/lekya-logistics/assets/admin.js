(function ($) {
    const ordersEl = $('[data-role="orders"]');
    const driversEl = $('[data-role="drivers"]');
    const cashBodyEl = $('[data-role="cash"] tbody');
    let driversIndex = {};
    let map;
    let markers = {};
    let firebaseApp;
    let firebaseDb;

    const headers = {
        'X-WP-Nonce': LekyaConfig.nonce
    };

    function init() {
        bindEvents();
        loadDrivers().then(() => loadOrders());
        loadCash();
        initMap();
        initFirebase();
    }

    function bindEvents() {
        $('[data-action="refresh-orders"]').on('click', loadOrders);
        $('[data-action="refresh-drivers"]').on('click', loadDrivers);
        $('[data-action="refresh-cash"]').on('click', loadCash);
        ordersEl.on('click', '[data-action="assign"]', assignDriver);
    }

    function renderOrders(orders = []) {
        ordersEl.empty();
        if (!orders.length) {
            ordersEl.append('<li class="lekya-order-item">No orders</li>');
            return;
        }

        orders.forEach(order => {
            const driver = driversIndex[order.driver_id] ? driversIndex[order.driver_id].name : 'Unassigned';
            const listItem = $(`
                <li class="lekya-order-item">
                    <strong>#${order.id} - ${order.title}</strong><br>
                    <span class="lekya-badge status-${order.status || 'pending'}">${order.status || 'pending'}</span><br>
                    Pickup: ${order.pickup_address || 'N/A'}<br>
                    Drop: ${order.delivery_address || 'N/A'}<br>
                    COD: ₹${Number(order.cod_amount || 0).toFixed(2)}<br>
                    Driver: <span data-role="driver-name">${driver}</span>
                    <div class="lekya-order-actions">
                        <select data-role="driver-select">
                            <option value="">Select driver</option>
                            ${Object.values(driversIndex).map(d => `<option value="${d.id}" ${d.id === order.driver_id ? 'selected' : ''}>${d.name}</option>`).join('')}
                        </select>
                        <button class="button button-primary" data-action="assign" data-order-id="${order.id}">Assign</button>
                    </div>
                </li>
            `);
            ordersEl.append(listItem);
        });
    }

    function renderDrivers(drivers = []) {
        driversEl.empty();
        if (!drivers.length) {
            driversEl.append('<li class="lekya-driver-item">No drivers found</li>');
            return;
        }
        drivers.forEach(driver => {
            const item = $(`
                <li class="lekya-driver-item">
                    <strong>${driver.name}</strong><br>
                    ${driver.phone || ''}<br>
                    ${driver.email || ''}
                </li>
            `);
            driversEl.append(item);
        });
    }

    function renderCashReports(reports = []) {
        cashBodyEl.empty();
        if (!reports.length) {
            cashBodyEl.append('<tr><td colspan="4">No records</td></tr>');
            return;
        }
        reports.forEach(report => {
            const driver = driversIndex[report.driver_id] ? driversIndex[report.driver_id].name : `#${report.driver_id}`;
            const row = $(`
                <tr>
                    <td>${driver}</td>
                    <td>₹${Number(report.amount).toFixed(2)}</td>
                    <td><span class="lekya-badge status-${report.status}">${report.status}</span></td>
                    <td>${report.note || '-'}</td>
                    <td>${new Date(report.created_at).toLocaleString()}</td>
                </tr>
            `);
            cashBodyEl.append(row);
        });
    }

    function loadOrders() {
        return fetch(`${LekyaConfig.restBase}/orders`, { headers })
            .then(res => res.json())
            .then(data => renderOrders(data.orders || []))
            .catch(() => renderOrders([]));
    }

    function loadDrivers() {
        return fetch(`${LekyaConfig.restBase}/drivers`, { headers })
            .then(res => res.json())
            .then(data => {
                driversIndex = {};
                (data.drivers || []).forEach(driver => {
                    driversIndex[driver.id] = driver;
                });
                renderDrivers(data.drivers || []);
            })
            .catch(() => renderDrivers([]));
    }

    function loadCash() {
        return fetch(`${LekyaConfig.restBase}/cash`, { headers })
            .then(res => res.json())
            .then(data => renderCashReports(data.reports || []))
            .catch(() => renderCashReports([]));
    }

    function assignDriver(event) {
        const button = $(event.currentTarget);
        const orderId = button.data('order-id');
        const select = button.closest('.lekya-order-item').find('[data-role="driver-select"]');
        const driverId = parseInt(select.val(), 10);
        if (!driverId) {
            alert('Select a driver');
            return;
        }

        button.prop('disabled', true).text('Assigning...');

        fetch(`${LekyaConfig.restBase}/orders/${orderId}/assign`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ driver_id: driverId })
        })
            .then(res => res.json())
            .then(() => loadOrders())
            .finally(() => button.prop('disabled', false).text('Assign'));
    }

    function initMap() {
        if (!window.L) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = setupLeafletMap;
            document.head.appendChild(script);
        } else {
            setupLeafletMap();
        }
    }

    function setupLeafletMap() {
        map = L.map('lekya-map').setView([17.3850, 78.4867], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }

    function initFirebase() {
        if (!window.firebase) {
            const script = document.createElement('script');
            script.src = 'https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js';
            script.onload = () => loadDatabase();
            document.head.appendChild(script);
        } else {
            loadDatabase();
        }
    }

    function loadDatabase() {
        if (!window.firebase) {
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/10.12.1/firebase-database-compat.js';
        script.onload = setupFirebase;
        document.head.appendChild(script);
    }

    function setupFirebase() {
        if (!window.firebase) {
            return;
        }
        firebaseApp = firebase.initializeApp(LekyaConfig.firebaseConfig || {});
        firebaseDb = firebaseApp.database();
        firebaseDb.ref('drivers').on('value', snapshot => {
            const data = snapshot.val() || {};
            updateDriverMarkers(data);
        });
    }

    function updateDriverMarkers(data) {
        if (!map) {
            return;
        }
        Object.keys(markers).forEach(id => {
            if (!data[id]) {
                map.removeLayer(markers[id]);
                delete markers[id];
            }
        });
        Object.keys(data).forEach(id => {
            const driverData = data[id];
            if (!driverData.lat || !driverData.lng) {
                return;
            }
            const latLng = [driverData.lat, driverData.lng];
            if (!markers[id]) {
                markers[id] = L.marker(latLng).addTo(map);
            } else {
                markers[id].setLatLng(latLng);
            }
            const driverName = driversIndex[parseInt(id, 10)] ? driversIndex[parseInt(id, 10)].name : `Driver ${id}`;
            markers[id].bindPopup(`<strong>${driverName}</strong><br>Status: ${driverData.status || 'Unknown'}`);
        });
    }

    $(document).ready(init);
})(jQuery);
