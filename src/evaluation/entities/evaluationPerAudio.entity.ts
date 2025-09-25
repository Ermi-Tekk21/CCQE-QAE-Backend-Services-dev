import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { AgentEvaluation } from "./evaluation.entity";
import { EvalPerQuestion } from "./evaluationPerQuestion.entity";
import { Appeal } from "src/appeal/entities/appeal.entity";

@Entity("evaluation_per_audio")
export class EvalPerAudio {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "uuid" })
    audio_id: string

    @Column({ type: "float", nullable: true })
    result: number

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
    deleted_at: Date;

    // relationship
    @ManyToOne(() => AgentEvaluation, (agent_eval) => agent_eval.eval_per_audio, {
        onDelete: 'CASCADE'
    })
    agent_evaluation: AgentEvaluation

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.eval_per_audio, {
        cascade: true
    })
    eval_per_question: EvalPerQuestion[]

    @OneToOne(() => Appeal, (appeal) => appeal.evaluation_per_audio)
    appeal: Appeal
}
