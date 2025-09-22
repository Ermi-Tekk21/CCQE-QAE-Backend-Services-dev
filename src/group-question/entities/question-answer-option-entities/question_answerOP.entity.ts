import { Column, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from "typeorm";
import { AnswerOptionLookup } from "src/answer-option-lookup/entities/answer-option-lookup.entity";
import { Question } from "../question-entities/question.entity";
import { EvalPerQuestion } from "src/evaluation/entities/evaluationPerQuestion.entity";
import { Exclude } from "class-transformer";

@Entity("question_answerOp")
export class QuestionAnswerOp {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    weight: number

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
    @Exclude()
    @ManyToOne(() => Question, (question) => question.question_answer_option, {
        onDelete: "CASCADE"
    })
    question: Question

    @ManyToOne(() => AnswerOptionLookup, (answer_option) => answer_option.question_answer_option)
    answer_option_lookup: AnswerOptionLookup

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question_answerOp)
    eval_per_question: EvalPerQuestion[]
}
