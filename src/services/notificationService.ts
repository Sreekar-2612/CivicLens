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

  public static async sendGrievanceReportAlert(
    report: { referenceId: string; title: string; category: string; locationDescription: string; reporterName?: string },
    contractorName?: string
  ): Promise<{ contractorPayload: NotificationPayload; auditorPayload: NotificationPayload }> {
    const sentAt = new Date().toISOString()

    const contractorPayload: NotificationPayload = {
      recipientEmail: `contractor.${(contractorName || 'general').toLowerCase().replace(/\s+/g, '')}@spadework.gov.in`,
      recipientPhone: '+91-98000-11223',
      subject: `🚨 ISSUE REPORTED [Ref: ${report.referenceId}]: ${report.title}`,
      body: `
      NEW CITIZEN GRIEVANCE LOGGED
      - Reference ID: ${report.referenceId}
      - Category: ${report.category}
      - Location: ${report.locationDescription}
      - Reported By: ${report.reporterName || 'Authenticated Resident'}
      
      ACTION REQUIRED BY CONTRACTOR (${contractorName || 'Assigned Vendor'}):
      Inspect the site, resolve the reported hazard/delay, and upload completion proof for Auditor verification.
      `,
      alertId: report.referenceId,
      severity: 'high',
      sentAt,
    }

    const auditorPayload: NotificationPayload = {
      recipientEmail: 'auditor.quality@spadework.gov.in',
      recipientPhone: '+91-98000-44556',
      subject: `📋 AUDIT TRACKING LOGGED [Ref: ${report.referenceId}]: ${report.title}`,
      body: `
      NEW ISSUE LOGGED FOR AUDIT TRACKING
      - Reference ID: ${report.referenceId}
      - Category: ${report.category}
      - Contractor: ${contractorName || 'Assigned Vendor'}
      
      AUDITOR ROLE: Track contractor progress and verify completion before granting final municipal approval.
      `,
      alertId: report.referenceId,
      severity: 'medium',
      sentAt,
    }

    console.log('📱 [CONTRACTOR DISPATCH]:', contractorPayload)
    console.log('📱 [AUDITOR DISPATCH]:', auditorPayload)

    this.alertLog.push(contractorPayload, auditorPayload)
    return { contractorPayload, auditorPayload }
  }

  public static getSentNotifications(): NotificationPayload[] {
    return this.alertLog
  }
}
