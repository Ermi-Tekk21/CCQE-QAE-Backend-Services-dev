import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { EvalPerAudio } from "./evaluationPerAudio.entity";
import { QuestionAnswerOp } from "src/question/entities/question_answerOP.entity";
import { Question } from "src/question/entities/question.entity";

@Entity("evaluation_per_question")
export class EvalPerQuestion {
    @PrimaryGeneratedColumn("uuid")
    id: string

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
    @ManyToOne(() => EvalPerAudio, (eval_per_audio) => eval_per_audio.eval_per_question)
    eval_per_audio: EvalPerAudio

    @ManyToOne(() => QuestionAnswerOp, (auestion_answerOp) => auestion_answerOp.eval_per_question)
    question_answerOP: QuestionAnswerOp

    @ManyToOne(() => Question, (question) => question.eval_per_question)
    question: Question
}
