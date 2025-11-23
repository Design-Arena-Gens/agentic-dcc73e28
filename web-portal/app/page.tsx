import { fetchCash, fetchDrivers, fetchOrders } from '../lib/api';

export default async function Dashboard() {
  const [orders, drivers, cash] = await Promise.all([
    fetchOrders().catch(() => ({ orders: [] })),
    fetchDrivers().catch(() => ({ drivers: [] })),
    fetchCash().catch(() => ({ reports: [] }))
  ]);

  const driverIndex = new Map(drivers.drivers.map((driver) => [driver.id, driver]));
  const cashTotal = cash.reports.reduce((total, report) => total + report.amount, 0);
  const outstanding = cash.reports.filter((report) => report.status !== 'approved');

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-4xl font-semibold text-white">Lekya Logistics Dashboard</h1>
        <p className="mt-2 text-slate-400">
          Real-time overview of orders, drivers, and cash reconciliation status.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <MetricCard title="Active Orders" value={orders.orders.length} subtitle="Shipments currently managed" />
        <MetricCard title="Drivers" value={drivers.drivers.length} subtitle="Registered drivers in fleet" />
        <MetricCard
          title="Cash Outstanding"
          value={`₹${cashTotal.toFixed(2)}`}
          subtitle={`${outstanding.length} pending approvals`}
        />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Panel title="Orders">
          <div className="space-y-4">
            {orders.orders.map((order) => (
              <article key={order.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">#{order.id} · {order.title}</h3>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-sm capitalize text-slate-200">
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  <p>Pickup: {order.pickup_address || 'N/A'}</p>
                  <p>Drop: {order.delivery_address || 'N/A'}</p>
                  <p>Driver: {driverIndex.get(order.driver_id)?.name ?? 'Unassigned'}</p>
                  <p>COD: ₹{order.cod_amount.toFixed(2)}</p>
                </div>
              </article>
            ))}
            {orders.orders.length === 0 && (
              <p className="text-sm text-slate-500">No orders available.</p>
            )}
          </div>
        </Panel>

        <Panel title="Cash Reconciliation">
          <div className="space-y-3">
            {cash.reports.map((report) => (
              <article key={report.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white">{driverIndex.get(report.driver_id)?.name ?? `#${report.driver_id}`}</h3>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-wide text-slate-200">
                    {report.status}
                  </span>
                </div>
                <p className="mt-2 text-slate-400">₹{report.amount.toFixed(2)}</p>
                <p className="text-xs text-slate-500">{new Date(report.created_at).toLocaleString()}</p>
                {report.note && <p className="mt-2 text-sm text-slate-400">{report.note}</p>}
              </article>
            ))}
            {cash.reports.length === 0 && (
              <p className="text-sm text-slate-500">No cash reports yet.</p>
            )}
          </div>
        </Panel>
      </section>

      <section>
        <Panel title="Driver Directory">
          <div className="grid gap-4 md:grid-cols-2">
            {drivers.drivers.map((driver) => (
              <article key={driver.id} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <h3 className="text-lg font-semibold text-white">{driver.name}</h3>
                <p className="text-sm text-slate-400">{driver.email}</p>
                <p className="text-sm text-slate-400">{driver.phone || 'No phone registered'}</p>
              </article>
            ))}
            {drivers.drivers.length === 0 && (
              <p className="text-sm text-slate-500">No drivers available.</p>
            )}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string | number; subtitle: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
      <p className="text-sm uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
