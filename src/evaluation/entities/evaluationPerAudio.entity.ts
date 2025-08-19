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

    @Column()
    is_deleted: boolean

    @CreateDateColumn()
    @Column({ type: "uuid" })
    created_by: string

    @CreateDateColumn()
    @Column({ type: "uuid" })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @CreateDateColumn()
    deleted_at: Date;

    // relationship
    @ManyToOne(() => AgentEvaluation, (agent_eval) => agent_eval.eval_per_audio)
    agent_evaluation: AgentEvaluation

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.eval_per_audio)
    eval_per_question: EvalPerQuestion[]
}
