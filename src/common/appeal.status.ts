/**
 * Appeal Statuses:
 * 
 * - `DRAFT`: The appeal has just been created. The next step is for the admin to either `REJECT` or `ACCEPT` the appeal.
 * - `ACCEPT ACTION`: The admin has reviewed and accepted the appeal. The appeal may proceed to further evaluation if required.
 * - `REJECT ACTION`: The admin has rejected the appeal. This status is typically followed by an automatic transition to `CLOSED`, with the `is_rejected` flag set to true.
 * - `UNDER_REVIEW`: After acceptance by the admin, the appeal is under further evaluation by a designated evaluator (e.g., for specific audio assessments).
 * - `CLOSED`: The appeal process is complete. No further actions can be taken.
 */

export enum appealStatus {
    DRAFT = 'draft',
    UNDER_REVIEW = 'under_review',
    CLOSED = 'closed',
}