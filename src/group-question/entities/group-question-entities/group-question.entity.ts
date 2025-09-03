import { groupQuestionStatus } from "src/common/group_question.status";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Question } from "src/group-question/entities/question-entities/question.entity";
import { AgentEvaluation } from "src/evaluation/entities/evaluation.entity";
import { VersionChangesDetail } from "../version-changes-detail.entity";

@Entity('group_question')
export class GroupQuestion {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    name: string

    @Column({ unique: true, nullable: true })
    version: string;

    @Column({ default: 100 })
    weight: number

    @Column({
        type: 'enum',
        enum: groupQuestionStatus,
        default: groupQuestionStatus.DRAFT
    })
    status: groupQuestionStatus

    @Column({ default: false })
    is_deleted: boolean

    @Column({default: false})
    is_active: boolean

    @Column({ type: "timestamp", nullable: true})
    evaluation_ends_at: Date

    @Column({ type: "uuid", nullable: true})
    created_by: string

    @Column({ type: "uuid", nullable: true })
    updated_by: string | null

    @Column({ type: "uuid", nullable: true })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @Column({ type: "timestamp", nullable: true })
    updated_at: Date | null

    @DeleteDateColumn({ type: "timestamp", nullable: true})
    deleted_at: Date | null;

    //relationship
    @OneToMany(() => Question, (question) => question.group_question, {
        cascade: true
    })
    question: Question[]

    @OneToMany(() => AgentEvaluation, (agent_evaluation) => agent_evaluation.group_question)
    agent_evaluation: AgentEvaluation[]

    @ManyToOne(() => GroupQuestion, (groupQuestion) => groupQuestion.id)
    parent: GroupQuestion | null

    @OneToMany(() => VersionChangesDetail, (versionChangesDetail) => versionChangesDetail.group_question)
    version_changes_detail: VersionChangesDetail[]
}
