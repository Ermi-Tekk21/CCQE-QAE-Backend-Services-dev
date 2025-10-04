import { agentEvalStatus } from "src/common/agent_evaluation.status";
import { GroupQuestion } from "src/group-question/entities/group-question-entities/group-question.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EvalPerAudio } from "./evaluationPerAudio.entity";

@Entity("agent_evaluation")
export class AgentEvaluation {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "uuid", unique: true })
    agent_assignment_id: string

    @Column({ type: "float", nullable: true })
    result: number | true

    @Column({
        type: 'enum',
        enum: agentEvalStatus,
        default: agentEvalStatus.OPENED,
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

    @CreateDateColumn({ type: "timestamp" })
    created_at: Date

    @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
    updated_at: Date | null;

    @DeleteDateColumn({ type: "timestamp", nullable: true, default: null })
    deleted_at: Date | null;

    @ManyToOne(() => GroupQuestion, (group_question) => group_question.agent_evaluation)
    group_question: GroupQuestion

    @OneToMany(() => EvalPerAudio, (eval_per_audio) => eval_per_audio.agent_evaluation, {
        cascade: true
    })
    eval_per_audio: EvalPerAudio[]

}
