import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AgentEvaluation } from "src/evaluation/entities/evaluation.entity";

@Entity("appeal-complain")
export class AppealComplain {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "text", unique: true })
    complain: string

    @CreateDateColumn({ type: "timestamp" })
    created_at: Date

    // Relationship
    @OneToMany(() => AgentEvaluation, (agentEval) => agentEval.complain)
    agent_evaluation: AgentEvaluation[]
}
