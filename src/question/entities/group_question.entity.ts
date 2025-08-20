import { groupQuestionStatus } from "src/common/group_question.status";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Question } from "./question.entity";
import { AgentEvaluation } from "src/evaluation/entities/evaluation.entity";

@Entity('group_question')
export class GroupQuestion {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true, type: 'float' })
    version: number;

    @Column({ default: 100 })
    weight: number

    @Column({
        type: 'enum',
        enum: groupQuestionStatus,
        default: groupQuestionStatus.DRAFT
    })
    status: groupQuestionStatus

    @Column({default: false})
    is_deleted: boolean

    @Column()
    is_active: boolean

    @Column({ type: "timestamp", nullable: true })
    evaluation_ends_at: Date

    @Column({ type: "uuid" })
    created_by: string

    @Column({ type: "uuid", nullable: true })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @Column({ type: "timestamp", nullable: true })
    deleted_at: Date;

    //relationship
    @OneToMany(() => Question, (question) => question.group_question)
    question: Question[]

    @OneToMany(() => AgentEvaluation, (agent_evaluation) => agent_evaluation.group_question)
    agent_evaluation: AgentEvaluation[]
}
