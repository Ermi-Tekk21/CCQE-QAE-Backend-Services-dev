import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AgentEvaluation } from "./evaluation.entity";
import { EvalPerQuestion } from "./evaluationPerQuestion.entity";

@Entity("evaluation_per_audio")
export class EvalPerAudio {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "uuid" })
    audio_id: string

    @Column({ type: "float" })
    result: number

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

    // relationship
    @ManyToOne(() => AgentEvaluation, (agent_eval) => agent_eval.eval_per_audio)
    agent_evaluation: AgentEvaluation

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.eval_per_audio)
    eval_per_question: EvalPerQuestion[]
}
