import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface OverviewStats {
  month: string;
  months: string[];
  cards: {
    residents: number;
    documentsIssued: number;
    complaintsFiled: number;
    artaCompliance: number | null;
    chatbotQueries: number;
    chatbotResolvedRate: number;
  };
  complaintTrend: Array<{ month: string; filed: number; resolved: number }>;
  complaintCategories: Array<{ category: string; count: number }>;
  bookingBusyDays: Array<{ day: string; count: number }>;
  serviceDemand: Array<{ service: string; count: number }>;
  inventoryLevels: Array<{ name: string; stockQty: number; threshold: number }>;
  compliance: Array<{
    slaClass: string;
    filed: number;
    completed: number;
    onTime: number;
    rate: number | null;
    status: 'Compliant' | 'At Risk' | 'Non-Compliant' | '—';
  }>;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SERVICE_LABELS: Record<string, string> = {
  DOCUMENT: 'Documents',
  CCTV: 'CCTV Review',
  MEDICINE: 'Free Medicine',
  EQUIPMENT: 'Equipment Lending',
  PRINTING: 'Printing (Students)',
};

@Injectable()
export class AnalyticsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  private monthRange(month: string): [string, string] {
    const [y, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return [start, next];
  }

  private lastMonths(n: number, from: Date): string[] {
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return out;
  }

  async overview(monthParam?: string): Promise<OverviewStats> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = /^\d{4}-\d{2}$/.test(monthParam ?? '') ? (monthParam as string) : currentMonth;
    const [start, next] = this.monthRange(month);

    const q = (sql: string, params: unknown[] = []) => this.db.query(sql, params);

    const [[{ residents }], [{ docs }], [{ complaints }], artaRows, chatbot] = await Promise.all([
      q(`SELECT COUNT(*) AS residents FROM users WHERE role = 'RESIDENT' AND is_active = 1`),
      q(
        `SELECT COUNT(*) AS docs FROM service_requests
         WHERE type = 'DOCUMENT' AND completed_at IS NOT NULL AND completed_at >= ? AND completed_at < ?`,
        [start, next],
      ),
      q(`SELECT COUNT(*) AS complaints FROM complaints WHERE filed_at >= ? AND filed_at < ?`, [start, next]),
      q(
        `SELECT COUNT(*) AS completed, SUM(completed_at <= due_at) AS on_time FROM service_requests
         WHERE completed_at IS NOT NULL AND completed_at >= ? AND completed_at < ?`,
        [start, next],
      ),
      q(`SELECT COUNT(*) AS total, COALESCE(SUM(resolved), 0) AS resolved FROM assistant_queries`),
    ]);

    const artaCompleted = Number(artaRows[0]?.completed ?? 0);
    const artaOnTime = Number(artaRows[0]?.on_time ?? 0);

    // Complaint trend — last 6 months, filed vs resolved (by last update for settled cases).
    const months6 = this.lastMonths(6, now).reverse();
    const trendFiled = await q(
      `SELECT DATE_FORMAT(filed_at, '%Y-%m') AS m, COUNT(*) AS n FROM complaints GROUP BY m`,
    );
    const trendResolved = await q(
      `SELECT DATE_FORMAT(COALESCE(resolved_at, updated_at), '%Y-%m') AS m, COUNT(*) AS n FROM complaints
       WHERE status IN ('RESOLVED','CFA_ISSUED') GROUP BY m`,
    );
    const filedMap = new Map<string, number>(trendFiled.map((r: any) => [r.m, Number(r.n)]));
    const resolvedMap = new Map<string, number>(trendResolved.map((r: any) => [r.m, Number(r.n)]));

    const categories = await q(`SELECT category, COUNT(*) AS n FROM complaints GROUP BY category ORDER BY n DESC`);
    const busyDays = await q(
      `SELECT DAYOFWEEK(date) AS d, COUNT(*) AS n FROM bookings WHERE status = 'CONFIRMED' GROUP BY d`,
    );
    const busyMap = new Map<number, number>(busyDays.map((r: any) => [Number(r.d), Number(r.n)]));
    const demand = await q(`SELECT type, COUNT(*) AS n FROM service_requests GROUP BY type ORDER BY n DESC`);
    const inventory = await q(`SELECT name, stock_qty, threshold FROM inventory_items ORDER BY category, name`);
    const compliance = await q(
      `SELECT sla_class, COUNT(*) AS filed,
              SUM(completed_at IS NOT NULL) AS completed,
              SUM(completed_at IS NOT NULL AND completed_at <= due_at) AS on_time
       FROM service_requests GROUP BY sla_class`,
    );

    return {
      month,
      months: this.lastMonths(6, now),
      cards: {
        residents: Number(residents),
        documentsIssued: Number(docs),
        complaintsFiled: Number(complaints),
        artaCompliance: artaCompleted ? Math.round((artaOnTime / artaCompleted) * 100) : null,
        chatbotQueries: Number(chatbot[0]?.total ?? 0),
        chatbotResolvedRate: Number(chatbot[0]?.total)
          ? Math.round((Number(chatbot[0].resolved) / Number(chatbot[0].total)) * 100)
          : 0,
      },
      complaintTrend: months6.map((m) => ({
        month: m,
        filed: filedMap.get(m) ?? 0,
        resolved: resolvedMap.get(m) ?? 0,
      })),
      complaintCategories: categories.map((r: any) => ({ category: r.category, count: Number(r.n) })),
      bookingBusyDays: [2, 3, 4, 5, 6, 7, 1].map((d) => ({ day: DAY_LABELS[d - 1], count: busyMap.get(d) ?? 0 })),
      serviceDemand: demand.map((r: any) => ({ service: SERVICE_LABELS[r.type] ?? r.type, count: Number(r.n) })),
      inventoryLevels: inventory.map((r: any) => ({
        name: r.name,
        stockQty: Number(r.stock_qty),
        threshold: Number(r.threshold),
      })),
      compliance: compliance.map((r: any) => {
        const completed = Number(r.completed);
        const rate = completed ? Math.round((Number(r.on_time) / completed) * 100) : null;
        return {
          slaClass: r.sla_class,
          filed: Number(r.filed),
          completed,
          onTime: Number(r.on_time),
          rate,
          status: rate === null ? ('—' as const) : rate >= 90 ? ('Compliant' as const) : rate >= 70 ? ('At Risk' as const) : ('Non-Compliant' as const),
        };
      }),
    };
  }

  /** Safe aggregates for the public login page — no auth required. */
  async publicStats(): Promise<{ residents: number; artaCompliance: number | null }> {
    const [[{ residents }], [arta]] = await Promise.all([
      this.db.query(`SELECT COUNT(*) AS residents FROM users WHERE role = 'RESIDENT' AND is_active = 1`),
      this.db.query(
        `SELECT COUNT(*) AS completed, SUM(completed_at <= due_at) AS on_time
         FROM service_requests WHERE completed_at IS NOT NULL`,
      ),
    ]);
    const completed = Number(arta?.completed ?? 0);
    return {
      residents: Number(residents),
      artaCompliance: completed ? Math.round((Number(arta.on_time) / completed) * 100) : null,
    };
  }

  /** Per-request ARTA audit rows (FR-12.4), optionally filtered by filing year. */
  async artaReport(year?: number): Promise<{ items: Array<Record<string, unknown>>; years: number[] }> {
    const where = year ? 'WHERE YEAR(r.filed_at) = ?' : '';
    const rows = await this.db.query(
      `SELECT r.id, u.full_name AS resident, r.type, r.title, r.sla_class, r.status,
              r.filed_at, r.due_at, r.completed_at
       FROM service_requests r JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.filed_at DESC LIMIT 200`,
      year ? [year] : [],
    );
    const yearRows: Array<{ y: number }> = await this.db.query(
      `SELECT DISTINCT YEAR(filed_at) AS y FROM service_requests ORDER BY y DESC`,
    );
    return {
      items: rows.map((r: any) => ({
        id: r.id,
        resident: r.resident,
        type: r.type,
        title: r.title,
        slaClass: r.sla_class,
        status: r.status,
        filedAt: new Date(r.filed_at).toISOString(),
        dueAt: new Date(r.due_at).toISOString(),
        completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
        onTime: r.completed_at ? new Date(r.completed_at) <= new Date(r.due_at) : null,
        overdueNow: !r.completed_at && new Date() > new Date(r.due_at),
      })),
      years: yearRows.map((r) => Number(r.y)),
    };
  }

  /** Rule-based ARTA narrative for the SLA report (same non-LLM approach as the dashboard). */
  async artaSummary(year?: number): Promise<{ draft: string }> {
    const { items } = await this.artaReport(year);
    const period = year ? `calendar year ${year}` : 'all recorded periods';
    if (!items.length) {
      return { draft: `No requests were filed in ${period}, so ARTA (RA 11032) performance cannot be assessed yet.` };
    }

    const completed = items.filter((r) => r.completedAt);
    const onTime = completed.filter((r) => r.onTime === true);
    const late = completed.filter((r) => r.onTime === false);
    const overdueNow = items.filter((r) => r.overdueNow);
    const rate = completed.length ? Math.round((onTime.length / completed.length) * 100) : null;

    const perClass = ['SIMPLE_3', 'COMPLEX_7', 'TECHNICAL_20']
      .map((cls) => {
        const inClass = completed.filter((r) => r.slaClass === cls);
        if (!inClass.length) return null;
        const ok = inClass.filter((r) => r.onTime === true).length;
        const label = cls === 'SIMPLE_3' ? 'Simple (3-day)' : cls === 'COMPLEX_7' ? 'Complex (7-day)' : 'Highly Technical (20-day)';
        return `${label}: ${ok}/${inClass.length} on time`;
      })
      .filter(Boolean);

    const verdict =
      rate === null
        ? 'No completions yet, so the compliance rate is not yet measurable.'
        : rate >= 90
          ? `At ${rate}%, the barangay is COMPLIANT with the RA 11032 processing standards.`
          : rate >= 70
            ? `At ${rate}%, compliance is AT RISK — review the late completions below the 90% target.`
            : `At ${rate}%, the barangay is NON-COMPLIANT with RA 11032 targets and corrective action is recommended.`;

    const lines = [
      `ARTA SLA performance for ${period}: ${items.length} request${items.length === 1 ? '' : 's'} filed, ${completed.length} completed, ${onTime.length} of those on or before the ARTA target date.`,
      verdict,
      perClass.length ? `By service class — ${perClass.join('; ')}.` : '',
      late.length
        ? `${late.length} completion${late.length === 1 ? ' was' : 's were'} late: ${late.slice(0, 3).map((r) => `"${r.title}" (${r.resident})`).join(', ')}${late.length > 3 ? '…' : ''}.`
        : 'No late completions in the period.',
      overdueNow.length
        ? `⚠ ${overdueNow.length} request${overdueNow.length === 1 ? ' is' : 's are'} currently past the ARTA deadline and should be escalated: ${overdueNow.slice(0, 3).map((r) => `"${r.title}" (${r.resident})`).join(', ')}${overdueNow.length > 3 ? '…' : ''}.`
        : 'No requests are currently overdue.',
    ].filter(Boolean);

    return { draft: lines.join(' ') };
  }

  /** Rule-based "AI summary draft" (FR-12.1) — same philosophy as the 591 Assistant. */
  async summary(month?: string): Promise<{ draft: string }> {
    const o = await this.overview(month);
    const topCategory = o.complaintCategories[0];
    const topService = o.serviceDemand[0];
    const busiest = [...o.bookingBusyDays].sort((a, b) => b.count - a.count)[0];
    const low = o.inventoryLevels.filter((i) => i.stockQty <= i.threshold);
    const monthName = new Date(`${o.month}-01T00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const lines = [
      `For ${monthName}, Barangay 591 served ${o.cards.residents} registered residents through the e-services portal.`,
      `${o.cards.documentsIssued} document${o.cards.documentsIssued === 1 ? ' was' : 's were'} issued and ${o.cards.complaintsFiled} complaint${o.cards.complaintsFiled === 1 ? ' was' : 's were'} filed this month.`,
      o.cards.artaCompliance !== null
        ? `ARTA (RA 11032) on-time completion stands at ${o.cards.artaCompliance}% for the month.`
        : `No requests were completed this month yet, so ARTA compliance is not yet measurable.`,
      topCategory ? `Complaints are led by the "${topCategory.category}" category (${topCategory.count} case${topCategory.count === 1 ? '' : 's'} overall).` : '',
      topService ? `${topService.service} remains the most-demanded service (${topService.count} total requests).` : '',
      busiest && busiest.count > 0 ? `Facility bookings peak on ${busiest.day}s.` : '',
      low.length
        ? `Inventory attention needed: ${low.map((i) => i.name).join(', ')} ${low.length === 1 ? 'is' : 'are'} at or below threshold.`
        : `All inventory items are above their auto-close thresholds.`,
      `The 591 Assistant handled ${o.cards.chatbotQueries} resident queries with a ${o.cards.chatbotResolvedRate}% self-service resolution rate.`,
    ].filter(Boolean);

    return { draft: lines.join(' ') };
  }
}
