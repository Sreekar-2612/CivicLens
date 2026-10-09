import type { CoordinationAlert, Department } from '../types'

export interface NotificationPayload {
  recipientEmail: string
  recipientPhone?: string
  subject: string
  body: string
  alertId: string
  severity: string
  sentAt: string
}

export class NotificationService {
  private static alertLog: NotificationPayload[] = []

  public static async sendCriticalClashAlert(
    alert: CoordinationAlert,
    deptA?: Department,
    deptB?: Department
  ): Promise<NotificationPayload> {
    const recipientEmail = deptA?.contactEmail || deptB?.contactEmail || 'commissioner@pmc.gov.in'
    const recipientPhone = deptA?.contactPhone || '+91-020-2501-0000'

    const subject = `⚠️ CRITICAL CLASH ALERT [Score ${alert.score}]: ${alert.reasons[0]?.description || 'Road Overlap'}`
    const body = `
    ATTENTION: High-risk inter-departmental clash detected on shared corridor.
    - Conflict Score: ${alert.score} / 100 (${alert.severity.toUpperCase()})
    - Department A: ${deptA?.name || 'Primary Agency'} (Project: ${alert.projectAId})
    - Department B: ${deptB?.name || 'Secondary Agency'} (Project: ${alert.projectBId})
    - Reasons: ${alert.reasons.map(r => r.description).join('; ')}
    
    ACTION REQUIRED: Please log into the SpadeWork Officer Portal to coordinate joint trenching dates.
    `

    const payload: NotificationPayload = {
      recipientEmail,
      recipientPhone,
      subject,
      body,
      alertId: alert.id,
      severity: alert.severity,
      sentAt: new Date().toISOString(),
    }

    console.log('📱 Sending Automated Clash Notification Alert:', payload)
    this.alertLog.push(payload)
    return payload
  }

  public static getSentNotifications(): NotificationPayload[] {
    return this.alertLog
  }
}
