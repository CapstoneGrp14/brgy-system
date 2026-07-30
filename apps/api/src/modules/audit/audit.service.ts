import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  /**
   * Append an audit entry. Fire-and-forget: auditing must never break the
   * action being audited, so failures are logged and swallowed.
   */
  log(entry: { actorLabel: string; actorId?: string | null; action: string; target?: string | null }): void {
    void this.repo
      .insert({
        actorLabel: entry.actorLabel,
        actorId: entry.actorId ?? null,
        action: entry.action,
        target: entry.target ?? null,
      })
      .catch((err) => this.logger.error(`Audit write failed: ${String(err)}`));
  }

  /** Admin audit screen (FR-13.1): newest first, optional text search. */
  async list(search?: string, take = 200): Promise<Array<{ id: string; at: string; actorLabel: string; action: string; target: string | null }>> {
    const qb = this.repo.createQueryBuilder('a').orderBy('a.at', 'DESC').take(Math.min(take, 500));
    if (search?.trim()) {
      qb.where('a.actor_label LIKE :q OR a.action LIKE :q OR a.target LIKE :q', { q: `%${search.trim()}%` });
    }
    const rows = await qb.getMany();
    return rows.map((r) => ({
      id: String(r.id),
      at: r.at.toISOString(),
      actorLabel: r.actorLabel,
      action: r.action,
      target: r.target,
    }));
  }
}
