import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { QuestionLookup } from "src/question-lookup/entities/question-lookup.entity"
import { Catagory } from "src/catagory/entities/catagory.entity"
import { GroupQuestion } from "src/group-question/entities/group-question.entity"
import { EvalPerQuestion } from "src/evaluation/entities/evaluationPerQuestion.entity"
import { QuestionAnswerOp } from "./question_answerOP.entity"

@Entity('question')
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    weight: number

    @Column({ default: false })
    is_deleted: boolean

    @Column({ type: "uuid" })
    created_by: string
    @Column({ type: "uuid", nullable: true })
    updated_by: string | null


    @Column({ type: "uuid", nullable: true })
    deleted_by: string;

    @CreateDateColumn()
    created_at: Date

    @Column({ type: "timestamp", nullable: true })
    updated_at: Date | null

    @Column({ type: "timestamp", nullable: true })
    deleted_at: Date;

    //relationship
    @ManyToOne(() => GroupQuestion, (group_question) => group_question.question)
    group_question: GroupQuestion

    @ManyToOne(() => QuestionLookup, (question_lookup) => question_lookup.question)
    question_lookup: QuestionLookup

    @ManyToOne(() => Catagory, (catagory) => catagory.question)
    catagory: Catagory

    @OneToMany(() => QuestionAnswerOp, (questionAnswerOp) => questionAnswerOp.question)
    question_answer_option: QuestionAnswerOp[]

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question)
    eval_per_question: EvalPerQuestion[]
}
