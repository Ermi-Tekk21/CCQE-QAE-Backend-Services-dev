import { QuestionLookup } from "src/question-lookup/entities/question-lookup.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("catagory")
export class Catagory {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ unique: true })
    name: string

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
    deleted_at: Date | null;

    //relationship
    @OneToMany(() => QuestionLookup, (questionLookup) => questionLookup.catagory)
    questionLookup: QuestionLookup[]
}
