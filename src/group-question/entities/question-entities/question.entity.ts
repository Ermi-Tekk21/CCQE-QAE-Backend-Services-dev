import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { QuestionLookup } from "src/question-lookup/entities/question-lookup.entity"
import { Catagory } from "src/catagory/entities/catagory.entity"
import { GroupQuestion } from "../group-question-entities/group-question.entity"
import { EvalPerQuestion } from "src/evaluation/entities/evaluationPerQuestion.entity"
import { QuestionAnswerOp } from "../question-answer-option-entities/question_answerOP.entity"
import { Exclude } from 'class-transformer';

@Entity('question')
export class Question {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column()
    weight: number

    @Column({ default: false })
    is_deleted: boolean

    //relationship
    @Exclude() 
    @ManyToOne(() => GroupQuestion, (group_question) => group_question.question, {
        onDelete: 'CASCADE'
    })
    group_question: GroupQuestion

    @ManyToOne(() => QuestionLookup, (question_lookup) => question_lookup.question)
    question_lookup: QuestionLookup

    @ManyToOne(() => Catagory, (catagory) => catagory.question)
    catagory: Catagory

    @OneToMany(() => QuestionAnswerOp, (questionAnswerOp) => questionAnswerOp.question, {
        cascade:true,
    })
    question_answer_option: QuestionAnswerOp[]

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question)
    eval_per_question: EvalPerQuestion[]
}
