import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { QuestionLookup } from "./lookups/question_lookup.entity"
import { Catagory } from "./catagory.entity"
import { GroupQuestion } from "./group_question.entity"
import { EvalPerQuestion } from "src/evaluation/entities/evaluationPerQuestion.entity"
import { QuestionAnswerOp } from "./question_answerOP.entity"

@Entity('question')
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    content: string

    @Column()
    weight: number

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

    //relationship
    @ManyToOne(() => QuestionLookup, (question_lookup) => question_lookup.question)
    question_lookup: QuestionLookup

    @ManyToOne(() => Catagory, (catagory) => catagory.question)
    catagory: Catagory

    @ManyToOne(() => GroupQuestion, (group_question) => group_question.question)
    group_question: GroupQuestion

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question)
    eval_per_question: EvalPerQuestion[]

    @OneToMany(() => QuestionAnswerOp, (questionAnswerOp) => questionAnswerOp.question)
    question_answer_ops: QuestionAnswerOp[]
}
