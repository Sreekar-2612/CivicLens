import type { Project, Department } from '../types'

export function generateProjectDossierHTML(project: Project, department?: Department): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Project Dossier - ${project.title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #021217; }
          .header { border-bottom: 3px solid #e2c09c; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #021217; margin: 0 0 8px 0; }
          .dept { font-size: 14px; color: #088c2e; font-weight: bold; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .card { background: #f8fafc; border: 1px solid #e2c09c; padding: 16px; border-radius: 8px; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 4px; }
          .val { font-size: 15px; font-weight: 600; color: #021217; }
          .status { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #f1f3d8; color: #021217; border: 1px solid #e2c09c; }
          .footer { font-size: 11px; color: #94a3b8; border-top: 1px solid #e2c09c; padding-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="dept">${department?.name || 'Municipal Works Authority'}</div>
          <h1 class="title">${project.title} (ID: ${project.id})</h1>
          <span class="status">${project.status.toUpperCase()}</span>
        </div>

        <div class="grid">
          <div class="card">
            <div class="label">Location & Corridor</div>
            <div class="val">${project.road}, ${project.locality} (${project.ward})</div>
          </div>
          <div class="card">
            <div class="label">Contractor Name</div>
            <div class="val">${project.contractor}</div>
          </div>
          <div class="card">
            <div class="label">Original Deadline (Immutable)</div>
            <div class="val">${project.originalEndDate}</div>
          </div>
          <div class="card">
            <div class="label">Revised Deadline</div>
            <div class="val">${project.revisedEndDate || 'No Extensions'}</div>
          </div>
          <div class="card">
            <div class="label">Allocated Budget</div>
            <div class="val">₹${project.budgetLakhs} Lakhs</div>
          </div>
          <div class="card">
            <div class="label">Physical Completion</div>
            <div class="val">${project.progressPercent}%</div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 30px;">
          <div class="label">Project Purpose & Scope</div>
          <div class="val" style="font-weight: normal; font-size: 14px; line-height: 1.5;">${project.purpose}</div>
        </div>

        <div class="footer">
          SpadeWork Infrastructure Dossier — Generated on ${new Date().toLocaleDateString()} — Official Municipal Copy
        </div>
      </body>
    </html>
  `
}

export function printProjectDossier(project: Project, department?: Department) {
  const html = generateProjectDossierHTML(project, department)
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }
}
