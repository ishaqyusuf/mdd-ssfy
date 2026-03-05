import type { Db } from "@gnd/db";
import { logger } from "@gnd/logger";
import { consoleLog } from "@gnd/utils";
import { createActivity, createNote } from "./activities";
import type {
  EmailInput,
  NotificationOptions,
  NotificationResult,
  UserData,
} from "./base";
import {
  getSubscribersAccount,
  getSubscribersForNotificationType,
} from "./channel-subscribers";
import { type NotificationTypes, createActivitySchema } from "./schemas";
import { EmailService } from "./services/email-service";
import { WhatsAppService } from "./services/whatsapp-service";
import { dispatchPackingDelay } from "./types/dispatch-packing-delay";
import { jobApproved } from "./types/job-approved";
import { jobAssigned } from "./types/job-assigned";
import { jobRejected } from "./types/job-rejected";
import { jobReviewRequested } from "./types/job-review-requested";
import { jobSubmitted } from "./types/job-submitted";
import { jobTaskConfigureRequest } from "./types/job-tasks-configure-request";
import { salesDispatchAssigned } from "./types/sales-dispatch-assigned";
import { salesEmailReminder } from "./types/sales-email-reminder";
import { salesRequestPacking } from "./types/sales-request-packing";
const handlers = {
  job_assigned: jobAssigned,
  job_submitted: jobSubmitted,
  job_approved: jobApproved,
  job_rejected: jobRejected,
  job_review_requested: jobReviewRequested,
  job_task_configure_request: jobTaskConfigureRequest,
  sales_dispatch_assigned: salesDispatchAssigned,
  sales_email_reminder: salesEmailReminder,
  sales_request_packing: salesRequestPacking,
  dispatch_packing_delay: dispatchPackingDelay,
} as const;
import { generateEmailMeta } from "./utils";

function isValidEmail(email?: string | null): email is string {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export class Notifications {
  #emailService: EmailService;
  #whatsAppService: WhatsAppService;
  #db: Db;
  public emailMeta: {
    from: string;
    replyTo: string;
  } = undefined as any;

  constructor(
    private db: Db,
    // private logger?: Logger,
  ) {
    this.#emailService = new EmailService(db);
    this.#whatsAppService = new WhatsAppService();
    this.#db = db;
  }

  async #createActivities<T extends keyof NotificationTypes>(
    handler: any,
    validatedData: NotificationTypes[T],
    groupId: string,
    // notificationType: string,
    author: UserData,
    // options?: NotificationOptions,
    contacts?: UserData[],
  ) {
    // if (handler?.createActivityWithoutContact) {
    //   const activityInput = handler.createActivity(
    //     validatedData,
    //     author,
    //     contacts?.[0] || author,
    //   );
    //   activityInput.groupId = groupId;
    //   const validatedActivity = createActivitySchema.parse(activityInput);
    //   const activity = await createActivity(
    //     this.#db,
    //     validatedActivity,
    //     author?.id,
    //   );
    //   return activity ? [activity] : [];
    // }
    console.log("++++++++++++++++++++");
    console.log("Creating activities for users:", contacts);
    const activityPromises = await Promise.all(
      (contacts || [])

        // .filter((a) => a.inAppNotification)
        .map(async (user: UserData) => {
          // if(!user?.inAppNotification)
          // return null;
          console.log("Creating activity for user:", user);
          const activityInput = handler.createActivity(
            validatedData,
            author,
            user,
          );
          // Check if user wants in-app notifications for this type
          // const inAppEnabled = await shouldSendNotification(
          //   this.#db,
          //   user.id,
          //   //  user.team_id,
          //   notificationType,
          //   "in_app",
          // );

          // Apply priority logic based on notification preferences
          // let finalPriority = activityInput.priority;

          // // Runtime priority override takes precedence
          // if (options?.priority !== undefined) {
          //   finalPriority = options.priority;
          // } else if (!inAppEnabled) {
          //   // If in-app notifications are disabled, set to low priority (7-10 range)
          //   // so it's not visible in the notification center
          //   finalPriority = Math.max(7, activityInput.priority + 4);
          //   finalPriority = Math.min(10, finalPriority); // Cap at 10
          // }

          // activityInput.priority = finalPriority;
          activityInput.groupId = groupId;

          // Validate with Zod schema
          const validatedActivity = createActivitySchema.parse(activityInput);

          // Create activity directly using DB query
          return createActivity(this.#db, validatedActivity, author?.id, [
            user.id,
          ]);
        }),
    );
    return activityPromises.filter(Boolean);
  }
  #createEmailInput<T extends keyof NotificationTypes>(
    handler: any,
    validatedData: NotificationTypes[T],
    author: UserData,
    user: UserData,
    // teamContext: { id: string; name: string; inboxId: string },
    // options?: NotificationOptions,
  ): EmailInput {
    // Create email input using handler's createEmail function
    const customEmail = handler.createEmail(
      validatedData,
      author,
      user,
      this.emailMeta,
      // , teamContext
    );
    // user.email
    const baseEmailInput: EmailInput = {
      user,
      ...customEmail,
      ...this.emailMeta,
    };

    // Apply runtime options (highest priority)
    // Extract non-email options first
    // const {
    //   // priority, sendEmail,
    //   ...resendOptions } = options || {};
    // if (Object.keys(resendOptions).length > 0) {
    //   Object.assign(baseEmailInput, resendOptions);
    // }

    return baseEmailInput;
  }
  #createWhatsAppInput<T extends keyof NotificationTypes>(
    handler: any,
    validatedData: NotificationTypes[T],
    author: UserData,
    user: UserData,
  ) {
    return handler.createWhatsApp(validatedData, author, user);
  }
  async saveNote(data, authId) {
    return createNote(this.#db, data, authId);
  }
  async create<T extends keyof NotificationTypes>(
    type: T,
    payload: Omit<NotificationTypes[T], "users">,
    // userIds?: number[],
    // author: UserData,
    options?: NotificationOptions,
    // contacts?: UserData[],
  ): Promise<NotificationResult> {
    const [author, ...contactsRaw] = (
      await Promise.all([
        new Promise<UserData[]>(async (resolve) => {
          if (!options?.author?.id) {
            return resolve([]);
          }
          const accounts = await getSubscribersAccount(
            this.#db,
            [options.author.id],
            {
              role: options.author.role!,
              channelName: type as string,
            },
          );
          resolve(accounts);
          // const account = await getSubscriberAccount(
          //   this.#db,
          //   options.author.id!,
          //   options.author.role!,
          // );
          // if (!account) {
          //   return resolve([]);
          // }
          // resolve([account]);
        }),
        ...(options?.recipients?.map((recipient) =>
          getSubscribersAccount(this.#db, recipient.ids || [], {
            role: recipient.role!,
            channelName: type as string,
          }),
        ) || []),
        new Promise<UserData[]>(async (resolve) => {
          const subscribers = await getSubscribersForNotificationType(
            this.#db,
            type as string,
          );

          resolve(subscribers);
        }),
        // getSubscribersForNotificationType(this.#db, type as string),
        // getTeamById(this.#db, teamId),
      ])
    ).flat();

    const fallbackContacts =
      contactsRaw.length === 0
        ? (
            await getSubscribersAccount(this.#db, [1], {
              role: "employee",
              channelName: type as string,
            })
          )?.map((a) => ({
            ...a,
            emailNotification: true,
            inAppNotification: true,
            whatsAppNotification: true,
          }))
        : [];
    const contacts = [...contactsRaw, ...fallbackContacts].filter(
      (contact, index, arr) => {
        // if (!contact?.id || contact.id === author?.id)
        // 	return false;
        return arr.findIndex((item) => item?.id === contact.id) === index;
      },
    );
    this.emailMeta = generateEmailMeta(author!, type);

    logger.info("Fetched author and contacts", author);

    // if (!teamInfo) {
    //   throw new Error(`Team not found: ${teamId}`);
    // }

    // if (teamMembers.length === 0) {
    //   return {
    //     type: type as string,
    //     activities: 0,
    //     emails: { sent: 0, skipped: 0, failed: 0 },
    //   };
    // }

    // Transform team members to UserData format
    // const users = teamMembers;

    // Build the full notification data
    const data = { ...payload } as NotificationTypes[T];

    // return null;
    return this.#createInternal(
      type,
      data,
      author!,
      // {
      //   ...(options || {}),
      // },
      contacts,
    );
  }

  async #createInternal<T extends keyof NotificationTypes>(
    type: T,
    data: NotificationTypes[T],
    author: UserData,
    // options: NotificationOptions,
    contacts?: UserData[],
    // teamInfo?: { id: string; name: string | null; inboxId: string | null },
  ): Promise<NotificationResult> {
    const handler = handlers[type as any];
    // const { author, contacts } = options;
    if (!handler) {
      throw new Error(`Unknown notification type: ${type}`);
    }

    try {
      // Validate input data with the handler's schema
      const validatedData = handler.schema.parse(data);

      const groupId = crypto.randomUUID();
      // Generate a single group ID for all related activities

      // Create activities for each user
      const activities = await this.#createActivities(
        handler,
        validatedData,
        groupId,
        // type as string,
        author,
        // options,
        contacts,
      );
      //   return null as any;
      // CONDITIONALLY send emails
      let emails = {
        sent: 0,
        skipped: contacts?.length || 0,
        failed: 0,
      };

      // const sendEmail = options?.sendEmail ?? false;

      // Send emails if requested and handler supports email
      if (handler?.createEmail) {
        const emailContacts = (contacts || []).filter(
          (user: UserData) =>
            user.emailNotification && isValidEmail(user.email),
        );
        const filteredOutCount = (contacts?.length || 0) - emailContacts.length;

        const emailInputs = emailContacts.map((user: UserData) =>
          this.#createEmailInput(
            handler,
            validatedData,
            author,
            user,
            // teamContext,
            // options,
          ),
        );

        if (!emailInputs.length) {
          emails = {
            sent: 0,
            skipped: contacts?.length || 0,
            failed: 0,
          };
        } else {
          console.log("📨 Email inputs for team:", emailInputs.length);

          const emailResult = await this.#emailService.sendBulk(
            emailInputs,
            type as string,
          );
          emails = {
            sent: emailResult.sent,
            skipped: emailResult.skipped + filteredOutCount,
            failed: emailResult.failed || 0,
          };

          console.log("📨 Email result for team:", {
            sent: emails.sent,
            skipped: emails.skipped,
            failed: emails.failed || 0,
          });
        }
      }

      let whatsapp = {
        sent: 0,
        skipped: contacts?.length || 0,
        failed: 0,
      };

      if (handler?.createWhatsApp) {
        const whatsAppContacts = (contacts || []).filter(
          (user) => !!user.whatsAppNotification,
        );
        const filteredOutCount =
          (contacts?.length || 0) - whatsAppContacts.length;
        const whatsAppInputs = whatsAppContacts.reduce<
          Array<{ user: UserData; message: string }>
        >((acc, user) => {
          const payload = this.#createWhatsAppInput(
            handler,
            validatedData,
            author,
            user,
          );
          if (payload?.message) {
            acc.push({ user, message: payload.message });
          }
          return acc;
        }, []);

        if (!whatsAppInputs.length) {
          whatsapp = {
            sent: 0,
            skipped: contacts?.length || 0,
            failed: 0,
          };
        } else {
          const result = await this.#whatsAppService.sendBulk(whatsAppInputs);
          whatsapp = {
            sent: result.sent,
            skipped: result.skipped + filteredOutCount,
            failed: result.failed,
          };
        }
      }

      return {
        type: type as string,
        activities: activities.length,
        emails,
        whatsapp,
      };
    } catch (error) {
      console.error(`Failed to send notification ${type}:`, error);
      throw error;
    }
  }
}
