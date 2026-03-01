import { NotificationEvent } from "./payload-utils";
import { NotificationAuthor } from "./payload-utils/index";

export * from "./payload-utils/index";

export const notify = (send) => {
  return {
    jobReviewRequested(
      input: NotificationEvent<"job_review_requested">["payload"] & {
        recipients?: NotificationEvent<"job_review_requested">["recipients"];
        author?: NotificationAuthor;
      },
    ) {
      const { recipients, author, ...payload } = input;
      return send("job_review_requested", {
        payload,
        author,
        recipients: recipients && recipients.length ? recipients : null,
      });
    },
  };
};
