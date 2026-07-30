export enum Role {
  RESIDENT = 'RESIDENT',
  EMPLOYEE = 'EMPLOYEE',
  ADMIN = 'ADMIN',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum CensusCategory {
  REGULAR = 'REGULAR',
  SENIOR = 'SENIOR',
  PWD = 'PWD',
  SOLO_PARENT = 'SOLO_PARENT',
}

export enum SlaClass {
  SIMPLE_3 = 'SIMPLE_3',
  COMPLEX_7 = 'COMPLEX_7',
  TECHNICAL_20 = 'TECHNICAL_20',
}

export enum RequestType {
  DOCUMENT = 'DOCUMENT',
  CCTV = 'CCTV',
  MEDICINE = 'MEDICINE',
  EQUIPMENT = 'EQUIPMENT',
  PRINTING = 'PRINTING',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CLAIMED = 'CLAIMED',
  OVERDUE = 'OVERDUE',
  ESCALATED = 'ESCALATED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

/** Socket.IO event names shared by gateway and clients (populated in Phase 7). */
export const SocketEvents = {
  SosNew: 'sos.new',
  SosResolved: 'sos.resolved',
  NotifyNew: 'notify.new',
  ChatMessage: 'chat.message',
  QueueUpdated: 'queue.updated',
} as const;
