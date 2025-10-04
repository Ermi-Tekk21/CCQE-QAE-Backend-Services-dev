/**
 * `opened`: Indicates that the evaluation for this agent is currently editable. 
 * The agent can review their results for each audio they have evaluated and submit complaints or feedback if needed. 
 * This status allows agents to make changes or raise concerns before the evaluation period ends.
 *
 * `closed`: Indicates that the evaluation period has ended and the evaluation is no longer editable. 
 * The exact time when the status changes to 'closed' corresponds to the end of the group question associated with this evaluation. 
 * After this point, agents cannot modify their evaluations or submit complaints.
 */
export enum agentEvalStatus {
    OPENED = 'opened',
    CLOSED = 'closed',
}