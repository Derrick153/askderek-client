import { Resend } from "resend";
import { prisma } from "./prisma";
import { emailWrapper, ctaButton } from "./email";

// -----------------------------------------------------------------------------
//  notificationEmailChannel.ts  (Step 17, Phase F)
//
//  Generic email delivery for the notification architecture. Reuses
//  the EXISTING Resend client/API key and the EXISTING emailWrapper/
//  ctaButton styling helpers - no new email provider, no new styling
//  system. Does not touch, replace, or duplicate any of the 7
//  hardcoded email functions in email.ts (sendPaymentConfirmationEmail
//  etc.) - those keep working exactly as they are for Rent's flows.
//  This is a parallel, generic path used only by the new notification
//  pipeline (Notification -> NotificationDelivery -> here).
// -----------------------------------------------------------------------------

const resend = new Resend(process.env.RESEND_API_KEY);

// -----------------------------------------------------------------------------
//  HTML ESCAPING (Step 17, Phase J)
//
//  Notification text is stored and shown in-app exactly as entered. It is only
//  escaped here, at the point it is placed into an HTML email. Values such as a
//  manager's typed rejection reason are user input and must never be read as
//  markup. "&" is replaced first so the entities added for the other characters
//  are not escaped a second time.
// -----------------------------------------------------------------------------
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderNotificationEmailBody = (message: string): string =>
  `<p>${escapeHtml(message)}</p>`;

// -----------------------------------------------------------------------------
//  SEND GENERIC NOTIFICATION EMAIL
//
//  Takes an arbitrary subject/body instead of a fixed template, so any
//  future event type works without a new hardcoded function. Never
//  throws - returns a result object the caller uses to update the
//  delivery row.
// -----------------------------------------------------------------------------
export const sendGenericNotificationEmail = async (
  to: string,
  subject: string,
  bodyHtml: string,
  actionUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const html = emailWrapper(
      bodyHtml + (actionUrl ? ctaButton(actionUrl, "View in AskDerek") : "")
    );
    const result = await resend.emails.send({
      from: "AskDerek <noreply@askderek.com>",
      to,
      subject,
      html,
    });
    if (result.error) {
      return { success: false, error: result.error.message };
    }
    return { success: true, messageId: result.data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
};

// -----------------------------------------------------------------------------
//  PROCESS EMAIL DELIVERY
//
//  Takes one EMAIL NotificationDelivery row, looks up the real
//  student's email, sends via the generic sender above, and updates
//  the delivery status (SENT or FAILED) with the real provider
//  message ID or the real error. Never throws.
// -----------------------------------------------------------------------------
export const processEmailDelivery = async (deliveryId: number) => {
  try {
    const delivery = await prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { notification: true },
    });
    if (!delivery || delivery.channel !== "EMAIL") return null;

    const user = await prisma.user.findUnique({
      where: { clerkId: delivery.notification.userClerkId },
      select: { email: true },
    });

    if (!user?.email) {
      return await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "FAILED",
          lastError: "No email on file for user",
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    const result = await sendGenericNotificationEmail(
      user.email,
      delivery.notification.title,
      renderNotificationEmailBody(delivery.notification.message),
      delivery.notification.actionUrl ?? undefined
    );

    if (result.success) {
      return await prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SENT",
          providerMessageId: result.messageId,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    return await prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: "FAILED",
        lastError: result.error,
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(`[EMAIL] Failed to process delivery ${deliveryId}:`, err);
    return null;
  }
};