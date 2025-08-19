import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Question } from "./question.entity";

@Entity("catagory")
export class Catagory {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    name: string

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
    @OneToMany(() => Question, (question) => question.catagory)
    question: Question[]
}