import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { EvalPerAudio } from "./evaluationPerAudio.entity";
import { QuestionAnswerOp } from "src/group-question/entities/question-answer-option-entities/question_answerOP.entity";
import { Question } from "src/group-question/entities/question-entities/question.entity";

@Entity("evaluation_per_question")
export class EvalPerQuestion {
    @PrimaryGeneratedColumn("uuid")
    id: string

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
    deleted_at: Date;

    // relationship
    @ManyToOne(() => EvalPerAudio, (eval_per_audio) => eval_per_audio.eval_per_question)
    eval_per_audio: EvalPerAudio

    @ManyToOne(() => QuestionAnswerOp, (question_answerOp) => question_answerOp.eval_per_question)
    question_answerOp: QuestionAnswerOp

    @ManyToOne(() => Question, (question) => question.eval_per_question)
    question: Question
}
