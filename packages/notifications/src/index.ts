import { Db } from "@gnd/db";
import { createNote, createActivity, getChannelSubcribers } from "./activities";
import { EmailService } from "./services/email-service";
import { createActivitySchema, NotificationTypes } from "./schemas";
import {
  EmailInput,
  NotificationOptions,
  NotificationResult,
  UserData,
} from "./base";
import { jobAssigned } from "./types/job-assigned-schema";
import { salesDispatchAssigned } from "./types/sales-dispatch-assigned";
import { consoleLog } from "@gnd/utils";
import { getSubscribersAccount } from "./channel-subscribers";
import { logger } from "@gnd/logger";
const handlers = {
  job_assigned: jobAssigned,
  sales_dispatch_assigned: salesDispatchAssigned,
} as const;
import { generateSenderEmail } from "./utils";
export class Notifications {
  #emailService: EmailService;
  #db: Db;
  public fromEmail: string;

  constructor(
    private db: Db,
    // private logger?: Logger,
  ) {
    this.#emailService = new EmailService(db);
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
    const activityPromises = await Promise.all(
      contacts!
        ?.filter((a) => a.inAppNotification)
        ?.map(async (user: UserData) => {
          // if(!user?.inAppNotification)
          // return null;
          const activityInput = handler.createActivity(validatedData, user);
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
    user: UserData,
    // teamContext: { id: string; name: string; inboxId: string },
    // options?: NotificationOptions,
  ): EmailInput {
    // Create email input using handler's createEmail function
    const customEmail = handler.createEmail(
      validatedData,
      user,
      this.fromEmail,
      // , teamContext
    );

    const baseEmailInput: EmailInput = {
      user,
      ...customEmail,
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
    // console.log("Creating notification:", { type, payload, options });
    const [author, ...contacts] = (
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

          console.log("Data", author);
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
        getChannelSubcribers(this.#db, type as string),
        // getTeamById(this.#db, teamId),
      ])
    ).flat();
    this.fromEmail = generateSenderEmail(author, type);
    logger.info("Fetched author and contacts", author);
    console.log("Data", author);
    return;
    // consoleLog("Fetched author and contacts:", author);
    // consoleLog("Fetched  contacts:", contacts);
    // console.log("Fetched team members:", contacts);
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
      console.log("validatedData:", validatedData);
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
      // return null as any;
      // CONDITIONALLY send emails
      let emails = {
        sent: 0,
        skipped: contacts?.length || 0,
        failed: 0,
      };

      // const sendEmail = options?.sendEmail ?? false;

      // Send emails if requested and handler supports email
      if (handler?.createEmail) {
        const firstUser = contacts?.[0]!;
        if (!firstUser) {
          throw new Error("No team members available for email context");
        }

        consoleLog("Creating email with context:", {
          firstUser,
        });
        const sampleEmail = handler.createEmail(
          validatedData,
          firstUser,
          this.fromEmail,
          // teamContext,
        );

        if (sampleEmail.emailType === "customer") {
          // Customer-facing email: send regardless of team preferences
          const emailInputs = [
            this.#createEmailInput(
              handler,
              validatedData,
              firstUser,
              // teamContext,
              // options,
            ),
          ];

          emails = await this.#emailService.sendBulk(
            emailInputs,
            type as string,
          );

          console.log("📨 Email result for customer:", {
            sent: emails.sent,
            skipped: emails.skipped,
            failed: emails.failed || 0,
          });
        } else if (sampleEmail.emailType === "owners") {
          // Owners-only email: send to team owners only
          const ownerUsers = contacts.filter(
            Boolean,
            // (user: UserData) => user.role === "owner",
          );

          const emailInputs = ownerUsers.map((user: UserData) =>
            this.#createEmailInput(
              handler,
              validatedData,
              user,
              // teamContext,
              // options,
            ),
          );

          console.log("📨 Email inputs for owners:", emailInputs.length);

          emails = await this.#emailService.sendBulk(
            emailInputs,
            type as string,
          );

          console.log("📨 Email result for owners:", {
            sent: emails.sent,
            skipped: emails.skipped,
            failed: emails.failed || 0,
          });
        } else {
          // Team-facing email: send to all team members
          const emailInputs = contacts!?.map((user: UserData) =>
            this.#createEmailInput(
              handler,
              validatedData,
              user,
              // teamContext,
              // options,
            ),
          );

          console.log("📨 Email inputs for team:", emailInputs.length);

          emails = await this.#emailService.sendBulk(
            emailInputs,
            type as string,
          );

          console.log("📨 Email result for team:", {
            sent: emails.sent,
            skipped: emails.skipped,
            failed: emails.failed || 0,
          });
        }
      }

      return {
        type: type as string,
        activities: activities.length,
        emails,
      };
    } catch (error) {
      console.error(`Failed to send notification ${type}:`, error);
      throw error;
    }
  }
}
