/**
 * Represents the status of a group question within the evaluation workflow.
 *
 * - `DRAFT`: The group question is in an editable state, allowing updates and modifications. 
 *   Its weight can be set between 0 and 100. This status is typically used during the creation 
 *   or revision phase before the question is finalized.
 *
 * - `PUBLISHED`: The group question is finalized and ready for agent evaluation. 
 *   Once published, the question becomes non-editable to ensure consistency during evaluation.
 *
 * - `CLOSED`: All agent evaluations associated with the group question have been completed. 
 *   This status indicates the end of the evaluation process for the group question.
 */
export enum groupQuestionStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    CLOSED = 'CLOSED',
}