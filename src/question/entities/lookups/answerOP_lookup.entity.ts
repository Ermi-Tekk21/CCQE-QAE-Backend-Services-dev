import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { QuestionAnswerOp } from "../question_answerOP.entity";

@Entity("answerOP_lookup")
export class AnswerOplookup {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "text" })
    content: string

    @Column()
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
    @OneToMany(()=> QuestionAnswerOp, (question_answerOP) => question_answerOP.answerOpLookup)
    question_answerOP: QuestionAnswerOp[]
}
