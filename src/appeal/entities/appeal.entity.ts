import { appealStatus } from "src/common/appeal.status";
import { EvalPerAudio } from "src/evaluation/entities/evaluationPerAudio.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("appeal")
export class Appeal {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({
        type: 'enum',
        enum: appealStatus,
        default: appealStatus.DRAFT
    })
    status: appealStatus

    @Column({ default: false })
    is_rejected: boolean

    @Column({ type: "text", default: null, nullable: true })
    rejection_reason: string | null

    @Column({ default: false })
    is_accepted: boolean

    @Column({ type: "json", nullable: true })
    changes: object

    @Column({ type: "uuid", nullable: true })
    created_by: string

    @Column({ type: "uuid", nullable: true })
    updated_by: string

    @CreateDateColumn({ type: "timestamp" })
    created_at: Date

    @UpdateDateColumn({ type: "timestamp", nullable: true, default: null })
    updated_at: Date | null;

    @Column({ type: "uuid", nullable: true })
    accepted_by: string;

    @Column({ type: "uuid", nullable: true })
    rejected_by: string;

    //relation
    @OneToOne(() => EvalPerAudio, (evalPerAudio) => evalPerAudio.appeal)
    @JoinColumn()
    evaluation_per_audio: EvalPerAudio
}
