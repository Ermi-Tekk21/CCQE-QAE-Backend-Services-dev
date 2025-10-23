import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"
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
    @ManyToOne(() => GroupQuestion, (group_question) => group_question.question, {
        onDelete: 'CASCADE'
    })
    group_question: GroupQuestion

    @ManyToOne(() => QuestionLookup, (question_lookup) => question_lookup.question)
    question_lookup: QuestionLookup

    @OneToMany(() => QuestionAnswerOp, (questionAnswerOp) => questionAnswerOp.question, {
        cascade: true,
    })
    question_answer_option: QuestionAnswerOp[]

    @OneToMany(() => EvalPerQuestion, (eval_per_question) => eval_per_question.question)
    eval_per_question: EvalPerQuestion[]
}
