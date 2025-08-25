import { Question } from "src/question/entities/question.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

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
    updated_by: string;

    @Column({ type: "uuid", nullable: true })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @Column({ type: "timestamp", nullable: true, default: null })
    updated_at: Date

    @Column({ type: "timestamp", nullable: true })
    deleted_at: Date | null;

    //relationship
    @OneToMany(() => Question, (question) => question.catagory)
    question: Question[]
}
