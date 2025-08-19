import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { AnswerOplookup } from "./lookups/answerOP_lookup.entity";
import { Question } from "./question.entity";
import { EvalPerQuestion } from "src/evaluation/entities/evaluationPerQuestion.entity";

@Entity("question_answerOp")
export class QuestionAnswerOp {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    weight: number

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

    //relationship
    @ManyToOne(() => Question, (question) => question.id)
    question: Question

    @ManyToOne(() => AnswerOplookup, (answer_option) => answer_option.question_answerOP)
    answerOpLookup: AnswerOplookup

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question_answerOP)
    eval_per_question: EvalPerQuestion[]
}