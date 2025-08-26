import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GroupQuestion } from "./group-question.entity";

@Entity("version_changes_detail")
export class VersionChangesDetail {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    year: string

    @Column()
    month: string

    @Column({type: "json"})
    changed_question_detail: object

    //relation ship
    @ManyToOne(() => GroupQuestion, (groupQuestion) => groupQuestion.version_changes_detail)
    group_question: GroupQuestion;
}