import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { groupQuestionStatus } from 'src/common/group_question.status';
import { DataSource, EntityManager } from 'typeorm';
import { Question } from 'src/group-question/entities/question-entities/question.entity';
import { QuestionAnswerOp } from 'src/group-question/entities/question-answer-option-entities/question_answerOP.entity';
import { AnswerOptionLookup } from 'src/answer-option-lookup/entities/answer-option-lookup.entity';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';
import { Catagory } from 'src/catagory/entities/catagory.entity';
import { GroupQuestion } from './entities/group-question-entities/group-question.entity';
import { VersionChangesDetail } from './entities/version-changes-detail.entity';
import { UpdateGroupQuestionDto } from './dto/group-question-dto/update-group-question.dto';
import { CreateGroupQuestionDto } from './dto/group-question-dto/create-group-question.dto';

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

      // const doesOtherExistWithnThisMonth = await entityManager.findOne(GroupQuestion, {
      //   where: { name: groupQuestionName, is_deleted: false },
      // });
      // if (doesOtherExistWithnThisMonth) {
      //   throw new HttpException(
      //     `You can't create more than one group question for the month of ${month} ${year}.`,
      //     HttpStatus.BAD_REQUEST,
      //   );
      // }

      // Create the GroupQuestion entity instance in memory.
      let group_question = entityManager.create(GroupQuestion, createGroupQuestionDto);
      group_question.name = groupQuestionName;
      group_question.status = groupQuestionStatus.DRAFT;
      group_question.created_by = createdByUserId;
      group_question.evaluation_ends_at = createGroupQuestionDto.evaluation_ends_at;

      // Determine the version (assuming `max` is intended to be for `GroupQuestion` itself)
      // Note: This block was already in your code.
      const max = await entityManager
        .createQueryBuilder(GroupQuestion, 'group_question')
        .select('MAX(group_question.version)', 'max')
        .getRawOne();
      group_question.version = (Number(max.max || 0) + 0.1).toFixed(1);

      // Calculate sum of question weights from the DTO's questions array.
      let sumOfQuestionWeights = 0;
      if (createGroupQuestionDto.questions && createGroupQuestionDto.questions.length > 0) {
        for (const queData of createGroupQuestionDto.questions) {
          sumOfQuestionWeights += queData.weight;
        }
      }
      group_question.weight = sumOfQuestionWeights;

      // Save the GroupQuestion for the first time. This makes it a managed entity and assigns an ID.
      let savedGroupQuestion = await entityManager.save(GroupQuestion, group_question);

      // Handle parent relationship and version change tracking AFTER initial save
      if (createGroupQuestionDto.parentId) {
        const parent = await entityManager.findOne(GroupQuestion, {
          where: { id: createGroupQuestionDto.parentId },
          relations: ['question', 'question.question_lookup', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
        });

        if (!parent) {
          throw new HttpException('Parent group question not found.', HttpStatus.NOT_FOUND);
        }
        // Link the saved GroupQuestion to its parent.
        savedGroupQuestion.parent = parent; // Assign parent to the already saved entity instance.

        // Declare year and month for versionChangesDetail
        const currentDate = new Date();
        const month = currentDate.toLocaleString('en-US', { month: 'short' });
        const year = currentDate.getFullYear().toString();

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
        const parentQuestionMap = new Map(parentQuestions.map(q => [q.question_lookup.content, q]));

        const currentQuestionMap = new Map(currentQuestions.map(q => [q.content, q]));
        // Check for removed questions
        for (const parentQ of parentQuestions) {
          if (!currentQuestionMap.has(parentQ.question_lookup.content)) {
            changes.removed.push({ content: parentQ.question_lookup.content });
          }
        }

        // Check for new and modified questions
        for (const currentQ of currentQuestions) {
          let parentQ: typeof parentQuestions[number] | undefined = undefined;
          parentQ = parentQuestionMap.get(currentQ.content);

          if (!parentQ) {
            // New question
            if (typeof currentQ.content === 'string') {
              changes.added.push({ content: currentQ.content ?? '', weight: currentQ.weight ?? 0 });
            }
          } else {
            // Check for modifications
            const modifiedQuestion = {
              content: currentQ.content ?? '',
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

            const parentAnswerOpsMap = new Map((parentQ.question_answer_option || []).map(qao => [qao.answer_option_lookup.content, qao]));
            const currentAnswerOpsMap = new Map((currentQ.question_answer_option || []).map(qao => [qao.content, qao])); // Corrected content access

            // Check for added answer options
            for (const [content, currentQao] of currentAnswerOpsMap) {
              if (typeof content === 'string' && !parentAnswerOpsMap.has(content)) {
                answerOpChanges.added.push({ content: content ?? '', weight: currentQao.weight ?? 0 });
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
              if (typeof content === 'string') {
                const parentQao = parentAnswerOpsMap.get(content);
                if (parentQao && currentQao.weight !== parentQao.weight) {
                  answerOpChanges.modified.push({
                    content,
                    weight: { from: parentQao.weight ?? 0, to: currentQao.weight ?? 0 }
                  });
                  isModified = true;
                }
              }
            }
            if (isModified) {
              modifiedQuestion.changes['answerOptions'] = answerOpChanges;
              changes.modified.push(modifiedQuestion);
            }
          }
        }

        const versionChangesDetail = entityManager.create(VersionChangesDetail, {
          group_question: savedGroupQuestion, // Reference the already saved entity
          year: year,
          month: month,
          changed_question_detail: changes,
        });

        await entityManager.save(versionChangesDetail);

        // Explicitly save `savedGroupQuestion` again to persist the parent link and version update.
        await entityManager.save(GroupQuestion, savedGroupQuestion);
      } else {
        savedGroupQuestion.parent = null; // Clear parent if no parentId, on the saved entity
      }

      // Process and save nested Questions and Answer Options.
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
          group_question: savedGroupQuestion, // Link to the already saved parent GroupQuestion
          question_lookup: questionLookup,
          is_deleted: false,
          created_by: createdByUserId,
          weight: queData.weight,
        });

        // here answer option is not created
        await entityManager.save(Question, newQuestion);
        const createdQAO: QuestionAnswerOp[] = []
        for (const ansData of queData.question_answer_option) {
          // Correctly access content from nested DTO

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
          createdQAO.push(qao)
          await entityManager.save(QuestionAnswerOp, qao);
        }
        newQuestion.question_answer_option = createdQAO
        await entityManager.save(Question, newQuestion);
        if (!savedGroupQuestion.question) {
          savedGroupQuestion.question = [];
        }
        savedGroupQuestion.question.push(newQuestion);
        await entityManager.save(GroupQuestion, savedGroupQuestion)
      }
      await queryRunner.commitTransaction();
      const responseData = {
        ...savedGroupQuestion,
        parent: savedGroupQuestion.parent ? savedGroupQuestion.parent.id : null,
      };

      return {
        success: true,
        message: 'Group question created successfully',
        group_question: responseData
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(): Promise<{
    success: boolean,
    "group questions": GroupQuestion[]
  }> {
    try {
      const groupQuestions = await this.dataSource.manager.find(GroupQuestion, {
        relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
      });
      return {
        success: true,
        "group questions": groupQuestions
      }
    } catch (error) {
      console.error('Error finding all group questions:', error);
      throw new InternalServerErrorException('Failed to retrieve group questions.');
    }
  }

  async findOne(id: string) {
    try {
      const gQue = await this.dataSource.manager.findOne(GroupQuestion, {
        where: { id: id },
        relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup', 'parent'],
      });
      if (!gQue) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`); // More specific message
      }

      const responseData = {
        ...gQue,
        parent: gQue.parent ? gQue.parent.id : null
      };

      return {
        success: true,
        "group question": responseData
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error occurred during finding group question:', error);
      throw new InternalServerErrorException("Error occurred during finding group question");
    }
  }

  async update(id: string, updateGroupQuestionDto: UpdateGroupQuestionDto): Promise<{
    success: boolean,
    message: string,
    "updated group question": GroupQuestion
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;
    const updatedByUserId = updateGroupQuestionDto.updated_by;

    try {
      let groupQuestion = await entityManager.findOne(GroupQuestion, {
        where: { id },
        relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
      });

      if (!groupQuestion) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      }

      entityManager.merge(GroupQuestion, groupQuestion, updateGroupQuestionDto);
      groupQuestion.updated_at = new Date();
      if (updatedByUserId) {
        groupQuestion.updated_by = updatedByUserId;
      }

      const existingQuestionsMap = new Map((groupQuestion.question || []).map(q => [q.id, q]));

      const questionsToSave: Question[] = [];

      // Process questions from the DTO
      if (updateGroupQuestionDto.updated_questions) {
        for (const dtoQ of updateGroupQuestionDto.updated_questions) {
          let questionEntity: Question | undefined;

          if (dtoQ.id) {
            // ID is provided, so this should be an update.
            if (!existingQuestionsMap.has(dtoQ.id)) {
              // If the ID doesn't exist in the current group, it's an error.
              throw new NotFoundException(`Question with ID "${dtoQ.id}" not found in this group.`);
            }

            // It's a valid update.
            questionEntity = existingQuestionsMap.get(dtoQ.id);
            if (questionEntity) {
              // If content is changing, we need to find/create a new lookup
              if (dtoQ.content && dtoQ.content !== questionEntity.question_lookup.content) {
                let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: dtoQ.content } });
                if (!questionLookup) {
                  questionLookup = entityManager.create(QuestionLookup, { content: dtoQ.content, created_by: updatedByUserId, is_deleted: false });
                  await entityManager.save(QuestionLookup, questionLookup);
                }
                questionEntity.question_lookup = questionLookup;
              }

              entityManager.merge(Question, questionEntity, dtoQ);
              await entityManager.save(Question, questionEntity);
            }
            existingQuestionsMap.delete(dtoQ.id); // Mark as processed
          } else {
            // No ID provided, so this is a new question.
            const { id: dtoId, ...questionData } = dtoQ;
            questionEntity = entityManager.create(Question, {
              ...questionData,
              group_question: groupQuestion,
              created_by: updatedByUserId || groupQuestion.created_by,
              is_deleted: false,
            });

            // Find or create the QuestionLookup for the new question
            let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: dtoQ.content } });
            if (!questionLookup) {
              questionLookup = entityManager.create(QuestionLookup, { content: dtoQ.content, created_by: updatedByUserId, is_deleted: false });
              await entityManager.save(QuestionLookup, questionLookup);
            }
            questionEntity.question_lookup = questionLookup;
          }

          if (questionEntity) {
            // Update question_lookup content if changed
            if (questionEntity.question_lookup && dtoQ.content !== questionEntity.question_lookup.content) {
              if (dtoQ.content) {
                questionEntity.question_lookup.content = dtoQ.content;
              }

              questionEntity.question_lookup.updated_by = updatedByUserId;
              questionEntity.question_lookup.updated_at = new Date();
              await entityManager.save(QuestionLookup, questionEntity.question_lookup);
            }
            if (dtoQ.catagoryId) {

              const catagoryEntity = await entityManager.findOne(Catagory, { where: { id: dtoQ.catagoryId } });
              if (!catagoryEntity) {
                throw new HttpException(`Category with ID "${dtoQ.catagoryId}" not found for question "${dtoQ.content}".`, HttpStatus.NOT_FOUND);
              }
              questionEntity.catagory = catagoryEntity;
              await entityManager.save(Question, questionEntity);
            }

            // Handle nested answer options
            const existingQaoMap = new Map((questionEntity.question_answer_option || []).map(qao => [qao.answer_option_lookup?.content, qao]));
            const qaosToSave: QuestionAnswerOp[] = [];

            if (dtoQ.updated_question_answer_option) {
              // Iterate over the DTO's answer options as the source of truth
              for (const dtoQao of dtoQ.updated_question_answer_option) {
                let qaoEntity: QuestionAnswerOp | undefined;
                const existingQao = existingQaoMap.get(dtoQao.content);

                if (existingQao) {
                  // Update existing QAO
                  qaoEntity = existingQao;
                  entityManager.merge(QuestionAnswerOp, qaoEntity, dtoQao);
                  await entityManager.save(QuestionAnswerOp, qaoEntity);
                } else {
                  // Create a new QAO and its lookup
                  const { id: dtoId, ...qaoData } = dtoQao;
                  let answerOptionLookup = await entityManager.findOne(AnswerOptionLookup, { where: { content: dtoQao.content } });
                  if (!answerOptionLookup) {
                    answerOptionLookup = entityManager.create(AnswerOptionLookup, { content: dtoQao.content, created_by: updatedByUserId, is_deleted: false });
                    await entityManager.save(AnswerOptionLookup, answerOptionLookup);
                  }

                  qaoEntity = entityManager.create(QuestionAnswerOp, {
                    ...qaoData,
                    question: questionEntity,
                    answer_option_lookup: answerOptionLookup,
                    is_deleted: false,
                  });
                  await entityManager.save(QuestionAnswerOp, qaoEntity);
                }
                qaosToSave.push(qaoEntity);
              }
              // Soft-delete QAOs that were removed from the DTO
              for (const [content, existingQao] of existingQaoMap.entries()) {
                if (!dtoQ.updated_question_answer_option.some(dtoQao => dtoQao.content === content)) {
                  if (!existingQao.is_deleted) {
                    existingQao.is_deleted = true;
                    existingQao.question = questionEntity
                    await entityManager.save(QuestionAnswerOp, existingQao);
                    qaosToSave.push(existingQao);
                  }
                }
              }
            }

            questionEntity.question_answer_option = qaosToSave;
            questionsToSave.push(questionEntity);
          }
        }
      }

      const qaosToUpdate: QuestionAnswerOp[] = [];

      // Soft-delete questions that are no longer in the DTO
      for (const existingQ of existingQuestionsMap.values()) {
        if (!existingQ.is_deleted) {
          existingQ.is_deleted = true;
          questionsToSave.push(existingQ);

          if (existingQ.question_answer_option) {
            for (const qao of existingQ.question_answer_option) {
              if (!qao.is_deleted) {
                qao.is_deleted = true;
                qao.question = existingQ
                qaosToUpdate.push(qao);
              }
            }
          }
        }
      }
      await entityManager.save(Question, questionsToSave);
      await entityManager.save(QuestionAnswerOp, qaosToUpdate);

      const allQuestions = await entityManager.find(Question, {
        where: { group_question: { id: groupQuestion.id } },
      });

      groupQuestion.question = allQuestions;
      groupQuestion.weight = allQuestions
        .filter(q => !q.is_deleted)
        .reduce((sum, q) => sum + q.weight, 0);

      // --- Parent tracking and versioning logic (mirrors the create function) ---
      if (updateGroupQuestionDto.parentId) {
        const parent = await entityManager.findOne(GroupQuestion, {
          where: { id: updateGroupQuestionDto.parentId },
          relations: ['question', 'question.question_lookup', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
        });
        if (!parent) {
          throw new HttpException('Parent group question not found.', HttpStatus.NOT_FOUND);
        }
        groupQuestion.parent = parent;
        groupQuestion.version = (parseFloat(parent.version) + 0.1).toFixed(1);

        const currentDate = new Date();
        const month = currentDate.toLocaleString('en-US', { month: 'short' });
        const year = currentDate.getFullYear().toString();

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
        const currentQuestions = updateGroupQuestionDto.updated_questions || [];

        const parentQuestionMap = new Map(parentQuestions.map(q => [q.question_lookup.content, q]));
        const currentQuestionMap = new Map(currentQuestions.map(q => [q.content, q]));

        for (const parentQ of parentQuestions) {
          if (!currentQuestionMap.has(parentQ.question_lookup.content)) {
            changes.removed.push({ content: parentQ.question_lookup.content });
          }
        }

        for (const currentQ of currentQuestions) {
          if (currentQ.content) {
            const parentQ = parentQuestionMap.get(currentQ.content);
            if (!parentQ) {
              changes.added.push({ content: currentQ.content ?? '', weight: currentQ.weight ?? 0 });
            } else {
              const modifiedQuestion: {
                content: string;
                changes: {
                  questionWeight?: { from: number; to: number };
                  answerOptions?: {
                    added: { content: string; weight: number }[];
                    removed: { content: string; weight: number }[];
                    modified: { content: string; weight: { from: number; to: number } }[];
                  };
                };
              } = {
                content: currentQ.content,
                changes: {}
              };
              let isModified = false;
              const answerOpChanges: {
                added: { content: string; weight: number }[];
                removed: { content: string; weight: number }[];
                modified: { content: string; weight: { from: number; to: number } }[];
              } = { added: [], removed: [], modified: [] };

              if (currentQ.weight !== parentQ.weight) {
                modifiedQuestion.changes.questionWeight = {
                  from: parentQ.weight,
                  to: currentQ.weight ?? 0
                };
                isModified = true;
              }

              const parentAnswerOpsMap = new Map(parentQ.question_answer_option.map(qao => [qao.answer_option_lookup.content, qao]));
              const currentAnswerOpsMap = new Map((currentQ.updated_question_answer_option || []).map(qao => [qao.content, qao]));

              for (const [content, currentQao] of currentAnswerOpsMap) {
                if (typeof content === 'string' && !parentAnswerOpsMap.has(content)) {
                  answerOpChanges.added.push({ content, weight: currentQao.weight ?? 0 });
                  isModified = true;
                }
              }

              for (const [content, parentQao] of parentAnswerOpsMap) {
                if (!currentAnswerOpsMap.has(content)) {
                  answerOpChanges.removed.push({ content, weight: parentQao.weight });
                  isModified = true;
                }
              }

              for (const [content, currentQao] of currentAnswerOpsMap) {
                if (typeof content === 'string') {
                  const parentQao = parentAnswerOpsMap.get(content);
                  if (parentQao && currentQao.weight !== parentQao.weight) {
                    answerOpChanges.modified.push({
                      content,
                      weight: { from: parentQao.weight ?? 0, to: currentQao.weight ?? 0 }
                    });
                    isModified = true;
                  }
                }
              }

              if (isModified) {
                modifiedQuestion.changes.answerOptions = answerOpChanges;
                changes.modified.push(modifiedQuestion);
              }
            }
          }
        }

        const versionChangesDetail = entityManager.create(VersionChangesDetail, {
          group_question: groupQuestion,
          year: year,
          month: month,
          changed_question_detail: changes,
        });

        await entityManager.save(VersionChangesDetail, versionChangesDetail);
      } else {
        groupQuestion.parent = null;
      }

      await entityManager.save(GroupQuestion, groupQuestion);
      await queryRunner.commitTransaction();

      return { success: true, message: `Group question with ID "${id}" updated successfully.`, "updated group question": groupQuestion };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error updating group question:', error);
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update group question due to an unexpected error.');
    } finally {
      await queryRunner.release();
    }
  }

  async publish(id: string): Promise<{
    success: boolean,
    message: string,
    "published group question": GroupQuestion
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;

    try {
      const gQue = await entityManager.findOne(GroupQuestion, { where: { id } });

      if (!gQue) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      }

      if (gQue.status == groupQuestionStatus.PUBLISHED) {
        throw new HttpException("already published group question", HttpStatus.BAD_REQUEST)
      }

      if (gQue.weight === 100) {
        gQue.is_active = true;
        gQue.status = groupQuestionStatus.PUBLISHED

        await entityManager.save(GroupQuestion, gQue);
        await queryRunner.commitTransaction();

        return {
          success: true,
          message: `Group question "${gQue.name}" published successfully.`,
          "published group question": gQue
        };

      } else if (gQue.weight < 100) {
        throw new HttpException(
          `Group question weight is ${gQue.weight}, which is less than 100. It cannot be published.`,
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          `Group question weight is ${gQue.weight}, which is more than 100. It cannot be published.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction(); // Rollback on error
      console.error('Error publishing group question:', error);
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to publish group question due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async undoPublish(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;

    try {
      const gQue = await entityManager.findOne(GroupQuestion, { where: { id } });

      if (!gQue) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      }

      if (gQue.is_active == true) {
        gQue.is_active = false
        gQue.status = groupQuestionStatus.DRAFT
        await entityManager.save(GroupQuestion, gQue);
        await queryRunner.commitTransaction();
      } else {
        throw new HttpException("already un published group question", HttpStatus.BAD_REQUEST)
      }

      return { message: `Group question "${gQue.name}" status changed to draft successfully.`, group_question: gQue };
    } catch (error) {
      await queryRunner.rollbackTransaction(); // Rollback on error
      console.error('Error deactivating group question:', error);
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to desctivate group question due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string): Promise<{
    success: boolean,
    message: string
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;

    try {
      const gQue = await entityManager.findOne(GroupQuestion, {
        where: { id },
        relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
        withDeleted: true
      });

      if (!gQue) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      } else {
        if (gQue.status !== groupQuestionStatus.DRAFT) {
          throw new BadRequestException('you can not delete published and completed group question, only draft group question are possible to delete')
        }
        await entityManager.remove(GroupQuestion, gQue);
        await queryRunner.commitTransaction();
      }

      return {
        success: true,
        message: `Group question "${gQue.name}" removed successfully.`
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error.code == 23503) {
        throw new BadRequestException("this group question is related to other data, you can not delete")
      }

      if (error instanceof NotFoundException || error instanceof HttpException || error instanceof BadRequestException) {
        throw error;
      }

      throw new HttpException(
        'Failed to remove group question due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async softDelete(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;

    try {

      const gQue = await entityManager.findOne(GroupQuestion, { where: { id } });

      if (!gQue) {
        const isTempDeleted = await entityManager.findOne(GroupQuestion, { where: { id }, withDeleted: true });
        if (isTempDeleted) {
          throw new NotFoundException(`Group question with ID "${id}" already soft deleted`);
        }
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      }


      await entityManager.softDelete(GroupQuestion, { id: gQue.id });
      gQue.deleted_at = new Date
      gQue.is_deleted = true
      await entityManager.save(GroupQuestion, gQue)

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: "group question temporally deleted successfully",
        "temp deleted group question": gQue
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to delete group question due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async undoSoftDelete(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;

    try {
      const gQue = await entityManager.findOne(GroupQuestion, { where: { id }, withDeleted: true });

      if (!gQue) {
        throw new NotFoundException(`Group question with ID "${id}" not found`);
      } else {
        const isNotDeleted = await entityManager.findOne(GroupQuestion, { where: { id, is_deleted: false }, withDeleted: false })
        if (isNotDeleted) {
          throw new NotFoundException(`Group question with ID "${id}" is already not soft deleted`);
        }
      }

      await entityManager.restore(GroupQuestion, { id: gQue.id });
      gQue.is_deleted = false
      gQue.deleted_at = null
      await entityManager.save(GroupQuestion, gQue);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: "group question restored successfully",
        "temp deleted group question": gQue
      }
    } catch (error) {
      await queryRunner.rollbackTransaction(); // Rollback on error
      console.error('resoring delete group question:', error);
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to undo delete group question due to an unexpected error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
