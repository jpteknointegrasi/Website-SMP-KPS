/**
 * E-mail. With SMTP_HOST configured mail is sent through it and only metadata is logged. Without it (development)
 * the message is stored in mail_log so it can be read on the development mailbox page; nothing is sent.
 */
import nodemailer from 'nodemailer'

let transport: nodemailer.Transporter | null = null
const smtp = () =>
  (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  }))

export const mailConfigured = () => Boolean(process.env.SMTP_HOST)

export async function sendMail(m: { to: string; subject: string; text: string }, meta: { schoolName: string }) {
  if (!mailConfigured()) return { sent: false }
  await smtp().sendMail({
    // SMTP_FROM ("Nama <alamat>") or, like the website, SMTP_FROM_NAME + SMTP_FROM_ADDRESS
    from:
      process.env.SMTP_FROM ||
      (process.env.SMTP_FROM_ADDRESS
        ? `"${process.env.SMTP_FROM_NAME || meta.schoolName}" <${process.env.SMTP_FROM_ADDRESS}>`
        : `"${meta.schoolName}" <no-reply@${process.env.PLATFORM_ROOT_DOMAIN || 'localhost'}>`),
    to: m.to,
    subject: m.subject,
    text: `${m.text}\n\n—\nPesan otomatis dari portal ${meta.schoolName}. Jangan balas email ini.`,
  })
  return { sent: true }
}
