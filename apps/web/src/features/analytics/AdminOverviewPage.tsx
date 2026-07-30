import { SLA_META } from '@brgy/shared';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  downloadMonthlyReportCsv,
  fetchSummaryDraft,
  useOverview,
} from '../../api/analytics';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { btnPrimary, card, cols, pill, tableFixed, td, th } from '../../components/ui/kit';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useUiStore } from '../../stores/ui';

const PIE_COLORS = ['#2E66D0', '#F4A62A', '#27AE60', '#8E5CD9', '#D64541', '#16A5A3', '#7E8CA3'];

const monthLabel = (m: string) =>
  new Date(`${m}-01T00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

function StatCard({ icon, labelText, value, sub }: { icon: string; labelText: string; value: string; sub?: string }) {
  return (
    <div style={{ ...card, padding: '16px 18px', flex: '1 1 170px', minWidth: 150 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.05em', color: '#7E8CA3' }}>
        {icon} {labelText.toUpperCase()}
      </div>
      <div style={{ font: '800 26px Poppins, sans-serif', color: '#1E3A5F', marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#8A97AB', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ ...card, padding: '18px 20px', minWidth: 0 }}>
      <h3 style={{ margin: '0 0 10px', font: '700 14px Poppins, sans-serif', color: '#1E3A5F' }}>{title}</h3>
      <div style={{ width: '100%', height: 230 }}>{children}</div>
    </div>
  );
}

/** Admin Dashboard Overview & Analytics (FR-12.1/12.2/12.3). */
export function AdminOverviewPage() {
  const isMobile = useIsMobile();
  const toast = useUiStore((s) => s.toast);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data: o } = useOverview(month);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryBusy, setSummaryBusy] = useState(false);

  const openSummary = async () => {
    if (summaryBusy) return;
    setSummaryBusy(true);
    try {
      setSummary(await fetchSummaryDraft(o?.month));
    } catch {
      toast('Could not draft the summary — try again.');
    } finally {
      setSummaryBusy(false);
    }
  };

  if (!o) return <div style={{ color: '#8A97AB', fontSize: 13.5 }}>Loading analytics…</div>;

  const complianceLabel: Record<string, string> = {
    SIMPLE_3: SLA_META.SIMPLE_3?.labelText ?? 'Simple — 3 days',
    COMPLEX_7: SLA_META.COMPLEX_7?.labelText ?? 'Complex — 7 days',
    TECHNICAL_20: SLA_META.TECHNICAL_20?.labelText ?? 'Highly Technical — 20 days',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: '#7E8CA3', fontWeight: 700 }}>MONTH</span>
          <Select
            value={o.month}
            onChange={(v) => setMonth(v)}
            options={o.months.map((m) => ({ value: m, labelText: monthLabel(m) }))}
            style={{ width: 190 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={openSummary}
            style={{ background: '#fff', border: '2px solid #1E3A5F', color: '#1E3A5F', borderRadius: 9, padding: '9px 16px', font: '700 12.5px Poppins, sans-serif', cursor: 'pointer' }}
          >
            {summaryBusy ? 'Drafting…' : '✨ AI Summary Draft'}
          </button>
          <button onClick={() => void downloadMonthlyReportCsv(o.month)} style={{ ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}>
            ⬇ Export Report (CSV)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <StatCard icon="👥" labelText="Registered Residents" value={String(o.cards.residents)} sub="active accounts" />
        <StatCard icon="📄" labelText="Documents Issued" value={String(o.cards.documentsIssued)} sub={monthLabel(o.month)} />
        <StatCard icon="⚖️" labelText="Complaints Filed" value={String(o.cards.complaintsFiled)} sub={monthLabel(o.month)} />
        <StatCard
          icon="⏱️"
          labelText="ARTA Compliance"
          value={o.cards.artaCompliance === null ? '—' : `${o.cards.artaCompliance}%`}
          sub="on-time completions"
        />
        <StatCard
          icon="🤖"
          labelText="Chatbot Queries"
          value={String(o.cards.chatbotQueries)}
          sub={`${o.cards.chatbotResolvedRate}% self-served`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
        <ChartCard title="⚖️ Complaint Trend — Filed vs Resolved (6 months)">
          <ResponsiveContainer>
            <LineChart data={o.complaintTrend} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F5" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="filed" name="Filed" stroke="#D64541" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#27AE60" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🍩 Complaints by Category">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={o.complaintCategories}
                dataKey="count"
                nameKey="category"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {o.complaintCategories.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📅 Booking Busy Days (confirmed)">
          <ResponsiveContainer>
            <BarChart data={o.bookingBusyDays} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F5" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Bookings" fill="#2E66D0" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🆓 Free-Service Demand (all time)">
          <ResponsiveContainer>
            <BarChart data={o.serviceDemand} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F5" />
              <XAxis dataKey="service" tick={{ fontSize: 10.5 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Requests" fill="#F4A62A" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="📦 Inventory Levels vs Auto-Close Threshold">
        <ResponsiveContainer>
          <BarChart data={o.inventoryLevels} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F5" />
            <XAxis dataKey="name" tick={{ fontSize: 10.5 }} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="stockQty" name="Stock" fill="#27AE60" radius={[5, 5, 0, 0]} />
            <Bar dataKey="threshold" name="Threshold" fill="#D64541" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div style={{ ...card, padding: '20px 24px' }}>
        <h3 style={{ margin: '0 0 12px', font: '700 14px Poppins, sans-serif', color: '#1E3A5F' }}>
          ⏱️ ARTA 3-7-20 Compliance (all time)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableFixed(680)}>
            <colgroup>
              {cols('30%', '14%', '16%', '14%', '12%', '14%').map((c) => (
                <col key={c.key} style={c.style} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={th}>SERVICE CLASS</th>
                <th style={th}>FILED</th>
                <th style={th}>COMPLETED</th>
                <th style={th}>ON TIME</th>
                <th style={th}>RATE</th>
                <th style={th}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {o.compliance.map((c) => (
                <tr key={c.slaClass}>
                  <td style={{ ...td, fontWeight: 700 }}>{complianceLabel[c.slaClass] ?? c.slaClass}</td>
                  <td style={td}>{c.filed}</td>
                  <td style={td}>{c.completed}</td>
                  <td style={td}>{c.onTime}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{c.rate === null ? '—' : `${c.rate}%`}</td>
                  <td style={td}>
                    {c.status === 'Compliant' && <span style={pill('green')}>Compliant</span>}
                    {c.status === 'At Risk' && <span style={pill('yellow')}>At Risk</span>}
                    {c.status === 'Non-Compliant' && <span style={pill('red')}>Non-Compliant</span>}
                    {c.status === '—' && <span style={pill('gray')}>No data</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {summary !== null && (
        <Modal title="✨ AI Summary Draft" onClose={() => setSummary(null)} width={620}>
          <p style={{ fontSize: 13.5, color: '#2E3A52', lineHeight: 1.7, margin: '0 0 14px', whiteSpace: 'pre-line' }}>{summary}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: '#8A97AB' }}>
              Drafted from live portal statistics — review before publishing.
            </span>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(summary);
                toast('📋 Summary copied to clipboard.');
              }}
              style={{ ...btnPrimary, width: 'auto', padding: '9px 16px', fontSize: 12.5 }}
            >
              Copy to Clipboard
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
