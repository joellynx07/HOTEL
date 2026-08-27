/**
 * src/utils/mail.js
 * Thin wrapper around Resend's HTTP API. Swap for Postmark/SES if
 * preferred — this function signature is the contract the rest of the
 * app depends on.
 */

import { env } from "../config/env.js";

export async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (!env.resendApiKey) {
    // No email provider configured (e.g. local dev) — log instead of failing signup.
    console.log(`[dev] Verification link for ${toEmail}: ${verifyUrl}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Spynx <accounts@spynx.app>",
      to: toEmail,
      subject: "Verify your Spynx account",
      html: `
        <p>One step left — verify your email to start listing your property.</p>
        <p><a href="${verifyUrl}">Verify email address</a></p>
        <p style="color:#71717a;font-size:13px">This link expires in 24 hours.</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Failed to send verification email: ${res.status} ${body}`);
  }
}
