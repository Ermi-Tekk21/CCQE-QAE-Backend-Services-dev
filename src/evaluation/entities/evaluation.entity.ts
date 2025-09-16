import { agentEvalStatus } from "src/common/agent_evaluation.status";
import { GroupQuestion } from "src/group-question/entities/group-question-entities/group-question.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EvalPerAudio } from "./evaluationPerAudio.entity";

@Entity("agent_evaluation")
export class AgentEvaluation {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "uuid" })
    agent_assignment_id: string

    @Column({ type: "float", nullable: true })
    result: number | true

    @Column({
        type: 'enum',
        enum: agentEvalStatus,
        default: agentEvalStatus.DRAFT
    })
    status: agentEvalStatus

    @Column({ default: false })
    is_deleted: boolean

    @Column({ type: "uuid", nullable: true })
    created_by: string

    @Column({ type: "uuid", nullable: true })
    updated_by: string

    @Column({ type: "uuid", nullable: true })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn({
        nullable: true,
        default: null
    })
    updated_at: Date | null;

    @Column({ type: "timestamp", nullable: true })
    deleted_at: Date;

    @ManyToOne(() => GroupQuestion, (group_question) => group_question.agent_evaluation)
    group_question: GroupQuestion

    @OneToMany(() => EvalPerAudio, (eval_per_audio) => eval_per_audio.agent_evaluation, {
        cascade: true
    })
    eval_per_audio: EvalPerAudio[]

}
