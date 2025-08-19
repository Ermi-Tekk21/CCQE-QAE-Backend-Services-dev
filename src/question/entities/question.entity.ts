import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { QuestionLookup } from "./lookups/question_lookup.entity"
import { Catagory } from "./catagory.entity"
import { GroupQuestion } from "./group_question.entity"
import { EvalPerQuestion } from "src/evaluation/entities/evaluationPerQuestion.entity"

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
    @ManyToOne(() => QuestionLookup, (question_lookup) => question_lookup.question)
    question_lookup: QuestionLookup

    @ManyToOne(() => Catagory, (catagory) => catagory.question)
    catagory: Catagory

    @ManyToOne(() => GroupQuestion, (group_question) => group_question.question)
    group_question: GroupQuestion

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question)
    eval_per_question: EvalPerQuestion[]
}