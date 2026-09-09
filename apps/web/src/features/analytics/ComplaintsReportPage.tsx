import { COMPLAINT_STATUS_META, type ComplaintStatus } from '@brgy/shared';
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
import { useOverview } from '../../api/analytics';
import { useComplaintsQueue } from '../../api/complaints';
import { card, pill } from '../../components/ui/kit';
import { useT } from '../../i18n';
import { useIsMobile } from '../../hooks/useMediaQuery';

const PIE_COLORS = ['#2E66D0', '#F4A62A', '#27AE60', '#8E5CD9', '#D64541', '#16A5A3', '#7E8CA3'];

/** Admin Complaints Report — trends, categories, and status mix. */
export function ComplaintsReportPage() {
  const isMobile = useIsMobile();
  const t = useT();
  const { data: o } = useOverview();
  const { data: queue } = useComplaintsQueue();

  const complaints = queue?.items ?? [];
  const statusCounts = Object.entries(
    complaints.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([status, count]) => ({
    status: t(COMPLAINT_STATUS_META[status as ComplaintStatus]?.labelText ?? status),
    count,
  }));

  if (!o) return <div style={{ color: '#8A97AB', fontSize: 13.5 }}>{t('Loading report…')}</div>;

  const settled = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CFA_ISSUED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...card, padding: '18px 22px', display: 'flex', gap: 26, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7E8CA3' }}>{t('TOTAL CASES')}</div>
          <div style={{ font: '800 24px Poppins, sans-serif', color: '#1E3A5F' }}>{complaints.length}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7E8CA3' }}>{t('SETTLED (RESOLVED / CFA)')}</div>
          <div style={{ font: '800 24px Poppins, sans-serif', color: '#27AE60' }}>{settled}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: '#7E8CA3' }}>{t('ACTIVE MEDIATION')}</div>
          <div style={{ font: '800 24px Poppins, sans-serif', color: '#C96A11' }}>{complaints.length - settled}</div>
        </div>
        <div style={{ alignSelf: 'center', marginLeft: 'auto' }}>
          <span style={pill('purple')}>{t('Katarungang Pambarangay · 20-day mediation clock')}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 18 }}>
        <div style={{ ...card, padding: '18px 20px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 10px', font: '700 14px Poppins, sans-serif', color: '#1E3A5F' }}>
            {t('Filed vs Resolved (6 months)')}
          </h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={o.complaintTrend} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="filed" name={t('Filed')} stroke="#D64541" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="resolved" name={t('Resolved')} stroke="#27AE60" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...card, padding: '18px 20px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 10px', font: '700 14px Poppins, sans-serif', color: '#1E3A5F' }}>{t('By Category')}</h3>
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={o.complaintCategories} dataKey="count" nameKey="category" innerRadius={55} outerRadius={88} paddingAngle={2}>
                  {o.complaintCategories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ ...card, padding: '18px 20px' }}>
        <h3 style={{ margin: '0 0 10px', font: '700 14px Poppins, sans-serif', color: '#1E3A5F' }}>{t('Status Mix')}</h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={statusCounts} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF0F5" />
              <XAxis dataKey="status" tick={{ fontSize: 10.5 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name={t('Cases')} fill="#8E5CD9" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
