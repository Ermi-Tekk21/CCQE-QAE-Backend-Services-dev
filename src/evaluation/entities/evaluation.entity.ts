import { agentEvalStatus } from "src/common/agent_evaluation.status";
import { GroupQuestion } from "src/group-question/entities/group-question-entities/group-question.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { EvalPerAudio } from "./evaluationPerAudio.entity";

@Entity("agent_evaluation")
export class AgentEvaluation {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "uuid" })
    agent_id: string

    @Column({ type: "uuid" })
    evaluator_id: string

    @Column({ type: "float" })
    result: number

    @Column({
        type: 'enum',
        enum: agentEvalStatus,
        default: agentEvalStatus.DRAFT
    })
    status: agentEvalStatus

    @Column({default: false})
    is_deleted: boolean

    @Column({ type: "uuid" })
    created_by: string

    @Column({ type: "uuid", nullable: true })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @Column({ type: "timestamp", nullable: true })
    deleted_at: Date;

    @ManyToOne(()=> GroupQuestion, (group_question)=> group_question.agent_evaluation)
    group_question: GroupQuestion

    @OneToMany(()=> EvalPerAudio, (eval_per_audio)=> eval_per_audio.agent_evaluation)
    eval_per_audio: EvalPerAudio[]
    
}
