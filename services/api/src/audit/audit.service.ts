import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../database/entities';

export interface RecordAuditEntryInput {
  organizationId?: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>) {}

  async record(input: RecordAuditEntryInput): Promise<void> {
    const entry = this.auditLogs.create({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata ?? {},
    });
    await this.auditLogs.save(entry);
  }
}
