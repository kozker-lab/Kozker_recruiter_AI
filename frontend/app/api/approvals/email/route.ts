import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, pipelineName, stageName, submitterName, contentPreview, directLink, rejectionChecklist, feedbackNotes } = body;

    if (!to) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    // Configure Nodemailer transporter (SMTP fallback / Ethereal test account)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "test.kozker@gmail.com",
        pass: process.env.SMTP_PASS || "dummy-pass",
      },
    });

    const isRejection = !!rejectionChecklist || !!feedbackNotes;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; color: #1f2937;">
        <div style="border-b: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: ${isRejection ? '#dc2626' : '#059669'}; font-size: 18px; text-transform: uppercase; margin: 0;">
            ${isRejection ? '⚠️ Stage Rejection & Change Request Alert' : '📋 Pending Approval Stage Notification'}
          </h2>
          <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">Kozker Recruiter AI Approval Operations</p>
        </div>

        <p style="font-size: 14px;">
          Hello,
        </p>

        <p style="font-size: 14px;">
          ${isRejection 
            ? `The approval workflow <strong>${pipelineName}</strong> has been rejected at stage <strong>${stageName}</strong> and returned to Stage 1 Draft for revision.` 
            : `You have been assigned to approve stage <strong>${stageName}</strong> for workflow <strong>${pipelineName}</strong> submitted by <strong>${submitterName || 'Team Member'}</strong>.`}
        </p>

        ${contentPreview ? `
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <h4 style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; color: #4b5563;">Content Summary Preview:</h4>
            <p style="font-size: 13px; font-style: italic; color: #374151; margin: 0;">"${contentPreview}"</p>
          </div>
        ` : ''}

        ${rejectionChecklist && rejectionChecklist.reasons && rejectionChecklist.reasons.length > 0 ? `
          <div style="background-color: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <h4 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #991b1b;">Rejection Checklist Reasons:</h4>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #991b1b;">
              ${rejectionChecklist.reasons.map((r: string) => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${feedbackNotes ? `
          <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; color: #be123c;">Approver Notes:</h4>
            <p style="font-size: 13px; color: #be123c; margin: 0;">${feedbackNotes}</p>
          </div>
        ` : ''}

        <div style="margin-top: 24px; text-align: center;">
          <a href="${directLink || 'http://localhost:3000/approvals'}" style="background-color: #059669; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-size: 13px; font-weight: bold; display: inline-block;">
            Open Approval Command Center
          </a>
        </div>

        <div style="border-t: 1px solid #e5e7eb; margin-top: 24px; padding-top: 12px; text-align: center; font-size: 11px; color: #9ca3af;">
          Sent automatically by Kozker Recruiter AI Platform.
        </div>
      </div>
    `;

    // Attempt email delivery
    try {
      await transporter.sendMail({
        from: '"Kozker Approvals" <no-reply@kozker.com>',
        to,
        subject: subject || `[Approval Needed] ${pipelineName} - Stage: ${stageName}`,
        html: htmlContent,
      });
      return NextResponse.json({ success: true, message: "Email alert dispatched successfully" });
    } catch (e: any) {
      console.warn("Nodemailer send warning (SMTP sandbox fallback):", e.message);
      return NextResponse.json({ success: true, warning: "SMTP fallback", details: e.message });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to dispatch approval email" }, { status: 500 });
  }
}
