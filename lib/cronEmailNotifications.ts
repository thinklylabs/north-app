import { Resend } from 'resend'

interface CronJobResult {
  jobName: string
  success: boolean
  processed: number
  errors: number
  totalItems?: number
  duration?: number
  details?: string
  errorMessage?: string
}

export async function sendCronJobNotification(result: CronJobResult) {
  try {
    if (!process.env.RESEND_API_KEY) {
       return
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const adminEmail = process.env.ADMIN_EMAIL || 'ansh.shetty.22@gmail.com'
    
    const statusEmoji = result.success ? '✅' : '❌'
    const statusText = result.success ? 'Completed Successfully' : 'Failed'
    
    const subject = `${statusEmoji} Cron Job ${statusText}: ${result.jobName}`
    
    const emailPayload = {
      from: `North Cron Monitor <${process.env.ADMIN_EMAIL || 'noreply@north.com'}>`,
      to: adminEmail,
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${result.success ? '#f0f9ff' : '#fef2f2'}; border-left: 4px solid ${result.success ? '#3b82f6' : '#ef4444'}; padding: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0 0 8px 0; color: ${result.success ? '#1e40af' : '#dc2626'}; font-size: 18px;">
              ${statusEmoji} Cron Job ${statusText}
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Job: <strong>${result.jobName}</strong>
            </p>
          </div>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">📊 Execution Summary</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">PROCESSED</p>
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">${result.processed}</p>
              </div>
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">ERRORS</p>
                <p style="margin: 0; color: ${result.errors > 0 ? '#dc2626' : '#059669'}; font-size: 18px; font-weight: 600;">${result.errors}</p>
              </div>
              ${result.totalItems ? `
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">TOTAL ITEMS</p>
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">${result.totalItems}</p>
              </div>
              ` : ''}
              ${result.duration ? `
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 12px;">DURATION</p>
                <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 600;">${result.duration}s</p>
              </div>
              ` : ''}
            </div>
          </div>
          
          ${result.details ? `
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">📝 Details</h3>
            <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">${result.details}</p>
          </div>
          ` : ''}
          
          ${!result.success && result.errorMessage ? `
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 8px 0; color: #dc2626; font-size: 14px;">🚨 Error Details</h3>
            <p style="margin: 0; color: #7f1d1d; font-size: 13px; font-family: monospace; background: #fff; padding: 8px; border-radius: 4px;">${result.errorMessage}</p>
          </div>
          ` : ''}
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 20px;">
            <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
              Cron job executed at ${new Date().toLocaleString()} UTC<br>
              This is an automated notification from North's cron monitoring system.
            </p>
          </div>
        </div>
      `
    }

    const sendResult = await resend.emails.send(emailPayload)
    
  } catch (emailError: any) {
    console.error(`❌ Failed to send cron job notification for ${result.jobName}:`, emailError)
    // Don't throw - email failures shouldn't break cron jobs
  }
}