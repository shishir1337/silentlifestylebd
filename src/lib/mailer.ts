import "server-only";

/**
 * Outbound email.
 *
 * The store has no email provider yet, and picking one is the client's call —
 * it costs money and is tied to their domain. So this is the seam, not the
 * implementation.
 *
 * In development, mail is written to the server log, which makes the password
 * reset flow fully testable without a provider: the link is right there in the
 * terminal. In production an unconfigured mailer throws, loudly and at the
 * point of use, rather than silently swallowing a reset the customer is
 * waiting for. A password reset that reports success and never arrives is the
 * worse failure — it sends someone to a phone call with support.
 *
 * To wire a real provider, implement `deliver` and nothing else changes.
 */

export interface Mail {
  to: string;
  subject: string;
  /** Plain text. Every Bangladeshi mail client renders it, and it cannot break. */
  text: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `\n--- mail (development) -------------------------------------------\n` +
        `to:      ${mail.to}\n` +
        `subject: ${mail.subject}\n\n` +
        `${mail.text}\n` +
        `------------------------------------------------------------------\n`,
    );
    return;
  }

  throw new Error(
    `No email provider is configured, so "${mail.subject}" could not be sent ` +
      `to ${mail.to}. Implement deliver() in src/lib/mailer.ts.`,
  );
}
