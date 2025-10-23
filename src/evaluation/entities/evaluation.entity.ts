import { agentEvalStatus } from "src/common/agent_evaluation.status";
import { GroupQuestion } from "src/group-question/entities/group-question-entities/group-question.entity";
import { BeforeInsert, Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { EvalPerAudio } from "./evaluationPerAudio.entity";
import { AppealComplain } from "src/appeal/entities/appealComplain.entity";

@Entity("agent_evaluation")
@Unique(["agent_assignment_id", "year_month"])
export class AgentEvaluation {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "uuid" })
    agent_assignment_id: string

    @Column()
    year_month: string

    @BeforeInsert()
    setPreviousMonth() {
        const date = new Date(
            new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
        );
        date.setDate(1);
        date.setMonth(date.getMonth() - 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        this.year_month = `${year}-${month}`;
    }

    @Column({ type: "float", nullable: true })
    result: number | true

    @Column({
        type: 'enum',
        enum: agentEvalStatus,
        default: agentEvalStatus.OPENED,
    })
    status: agentEvalStatus

    @Column({ default: false })
    is_appealed: boolean

    @Column({ default: false })
    is_re_evaluated: boolean

    @Column({ type: "json", nullable: true })
    changes: object

    @Column({ default: false })
    is_deleted: boolean

    @Column({ type: "uuid", nullable: true })
    created_by: string

    @Column({ type: "uuid", nullable: true })
    updated_by: string

    @Column({ type: "uuid", nullable: true })
    deleted_by: string | null;

    @CreateDateColumn({ type: "timestamp" })
    created_at: Date

    @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
    updated_at: Date | null;

    @DeleteDateColumn({ type: "timestamp", nullable: true, default: null })
    deleted_at: Date | null;

    @ManyToOne(() => GroupQuestion, (group_question) => group_question.agent_evaluation)
    group_question: GroupQuestion

    @OneToMany(() => EvalPerAudio, (eval_per_audio) => eval_per_audio.agent_evaluation)
    eval_per_audio: EvalPerAudio[]

    @ManyToOne(() => AppealComplain, (appealComplain) => appealComplain.id, { nullable: true })
    complain: AppealComplain | null

}
