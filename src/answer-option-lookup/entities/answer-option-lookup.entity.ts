import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { QuestionAnswerOp } from "src/question/entities/question_answerOP.entity";

@Entity("answer_option_lookup")
export class AnswerOptionLookup {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: "text" })
    content: string

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
    @OneToMany(()=> QuestionAnswerOp, (question_answerOP) => question_answerOP.answer_option_lookup)
    question_answer_option: QuestionAnswerOp[]
}
