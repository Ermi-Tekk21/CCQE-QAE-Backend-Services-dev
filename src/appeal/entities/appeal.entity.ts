import { EvalPerAudio } from "src/evaluation/entities/evaluationPerAudio.entity";
import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("appeal")
export class Appeal {
    @PrimaryGeneratedColumn("uuid")
    id: string

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

    //relation
    @OneToOne(() => EvalPerAudio, (evalPerAudio) => evalPerAudio.appeal)
    evaluation_per_audio: EvalPerAudio
}
