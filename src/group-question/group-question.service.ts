import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { groupQuestionStatus } from 'src/common/group_question.status';
import { DataSource, EntityManager } from 'typeorm';
import { Question } from 'src/question/entities/question.entity';
import { QuestionAnswerOp } from 'src/question/entities/question_answerOP.entity';
import { AnswerOptionLookup } from 'src/answer-option-lookup/entities/answer-option-lookup.entity';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';
import { Catagory } from 'src/catagory/entities/catagory.entity';
import { GroupQuestion } from './entities/group-question.entity';
import { VersionChangesDetail } from './entities/version-changes-detail.entity';
import { UpdateGroupQuestionDto } from './dto/update-group-question.dto';
import { CreateGroupQuestionDto } from './dto/create-group-question.dto';

@Injectable()
export class GroupQuestionService {
  constructor(
    private readonly dataSource: DataSource,
  ) { }

  async create(createGroupQuestionDto: CreateGroupQuestionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const entityManager: EntityManager = queryRunner.manager;

    try {
      const createdByUserId = createGroupQuestionDto.created_by;

      const doesActiveExist = await entityManager.findOne(GroupQuestion, {
        where: { is_active: true, is_deleted: false },
      });
      if (doesActiveExist) {
        throw new HttpException(
          "You can't create a new group question before the active one is completed.",
          HttpStatus.BAD_REQUEST,
        );
      }

      const currentDate = new Date();
      const month = currentDate.toLocaleString('en-US', { month: 'short' });
      const year = currentDate.getFullYear().toString();
      const groupQuestionName = `${month}/${year}/EP`;

      const doesOtherExistWithnThisMonth = await entityManager.findOne(GroupQuestion, {
        where: { name: groupQuestionName, is_deleted: false },
      });
      if (doesOtherExistWithnThisMonth) {
        throw new HttpException(
          `You can't create more than one group question for the month of ${month} ${year}.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const group_question = entityManager.create(GroupQuestion, createGroupQuestionDto);
      group_question.name = groupQuestionName;
      group_question.is_active = true;
      group_question.status = groupQuestionStatus.DRAFT;
      group_question.weight = group_question.weight || 100;
      group_question.created_by = createdByUserId;
      group_question.evaluation_ends_at = createGroupQuestionDto.evaluation_ends_at;
      group_question.version = '1.0';

      if (createGroupQuestionDto.parentId) {
        const parent = await entityManager.findOne(GroupQuestion, {
          where: { id: createGroupQuestionDto.parentId },
          relations: ['question', 'question.question_answer_ops', 'question.question_answer_ops.answer_option_lookup'],
        });
        if (!parent) {
          throw new HttpException('Parent group question not found.', HttpStatus.NOT_FOUND);
        }
        group_question.parent = parent;
        group_question.version = (parseFloat(parent.version) + 0.1).toFixed(1);

        const changes: {
          added: { content: string; weight: number }[];
          removed: { content: string }[];
          modified: {
            content: string;
            changes: {
              questionWeight?: { from: number; to: number };
              answerOptions?: {
                added: { content: string; weight: number }[];
                removed: { content: string; weight: number }[];
                modified: { content: string; weight: { from: number; to: number } }[];
              };
            };
          }[];
        } = {
          added: [],
          removed: [],
          modified: []
        };

        const parentQuestions = parent.question || [];
        const currentQuestions = createGroupQuestionDto.questions || [];

        const parentQuestionMap = new Map(parentQuestions.map(q => [q.content, q]));
        const currentQuestionMap = new Map(currentQuestions.map(q => [q.content, q]));

        // Check for removed questions
        for (const parentQ of parentQuestions) {
          if (!currentQuestionMap.has(parentQ.content)) {
            changes.removed.push({ content: parentQ.content });
          }
        }

        // Check for new and modified questions
        for (const currentQ of currentQuestions) {
          const parentQ = parentQuestionMap.get(currentQ.content);
          if (!parentQ) {
            // New question
            changes.added.push({ content: currentQ.content, weight: currentQ.weight });
          } else {
            // Check for modifications
            const modifiedQuestion = {
              content: currentQ.content,
              changes: {}
            };
            let isModified = false;
            const answerOpChanges: {
              added: { content: string; weight: number }[];
              removed: { content: string; weight: number }[];
              modified: { content: string; weight: { from: number; to: number } }[];
            } = { added: [], removed: [], modified: [] };

            // Compare question weights
            if (currentQ.weight !== parentQ.weight) {
              modifiedQuestion.changes['questionWeight'] = {
                from: parentQ.weight,
                to: currentQ.weight
              };
              isModified = true;
            }

            const parentAnswerOpsMap = new Map(parentQ.question_answer_ops.map(qao => [qao.answer_option_lookup.content, qao]));
            const currentAnswerOpsMap = new Map(currentQ.question_answerOP.map(qao => [qao.content, qao]));

            // Check for added answer options
            for (const [content, currentQao] of currentAnswerOpsMap) {
              if (!parentAnswerOpsMap.has(content)) {
                answerOpChanges.added.push({ content, weight: currentQao.weight });
                isModified = true;
              }
            }
            // Check for removed answer options
            for (const [content, parentQao] of parentAnswerOpsMap) {
              if (!currentAnswerOpsMap.has(content)) {
                answerOpChanges.removed.push({ content, weight: parentQao.weight });
                isModified = true;
              }
            }
            // Check for modified answer options
            for (const [content, currentQao] of currentAnswerOpsMap) {
              const parentQao = parentAnswerOpsMap.get(content);
              if (parentQao && currentQao.weight !== parentQao.weight) {
                answerOpChanges.modified.push({
                  content,
                  weight: { from: parentQao.weight, to: currentQao.weight }
                });
                isModified = true;
              }
            }
            if (isModified) {
              modifiedQuestion.changes['answerOptions'] = answerOpChanges;
              changes.modified.push(modifiedQuestion);
            }
          }
        }

        const versionChangesDetail = entityManager.create(VersionChangesDetail, {
          group_question: group_question,
          year: year,
          month: month,
          changed_question_detail: changes,
        });

        await entityManager.save(versionChangesDetail);
      } else {
        group_question.parent = null;
      }

      const savedGroupQuestion = await entityManager.save(GroupQuestion, group_question);

      for (const queData of createGroupQuestionDto.questions) {
        let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: queData.content } });
        if (!questionLookup) {
          questionLookup = entityManager.create(QuestionLookup, { content: queData.content, created_by: createdByUserId, is_deleted: false });
          await entityManager.save(QuestionLookup, questionLookup);
        }
        const catagoryEntity = await entityManager.findOne(Catagory, { where: { id: queData.catagoryId } });
        if (!catagoryEntity) {
          throw new HttpException('Catagory not found.', HttpStatus.NOT_FOUND);
        }

        const newQuestion = entityManager.create(Question, {
          content: queData.content,
          catagory: catagoryEntity,
          group_question: savedGroupQuestion,
          question_lookup: questionLookup,
          is_deleted: false,
          created_by: createdByUserId,
          weight: queData.weight,
        });

        await entityManager.save(Question, newQuestion);

        for (const ansData of queData.question_answerOP) {
          let answerOption = await entityManager.findOne(AnswerOptionLookup, { where: { content: ansData.content } });
          if (!answerOption) {
            answerOption = entityManager.create(AnswerOptionLookup, { content: ansData.content, created_by: createdByUserId, is_deleted: false });
            await entityManager.save(AnswerOptionLookup, answerOption);
          }

          const qao = entityManager.create(QuestionAnswerOp, {
            question: newQuestion,
            answer_option_lookup: answerOption,
            weight: ansData.weight,
            is_deleted: false,
            created_by: createdByUserId,
          });
          await entityManager.save(QuestionAnswerOp, qao);
        }
      }

      await queryRunner.commitTransaction();
      return { message: 'Group question created successfully', group_question: savedGroupQuestion };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return `This action returns all groupQuestion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} groupQuestion`;
  }

  update(id: number, updateGroupQuestionDto: UpdateGroupQuestionDto) {
    return `This action updates a #${id} groupQuestion`;
  }

  remove(id: number) {
    return `This action removes a #${id} groupQuestion`;
  }
}