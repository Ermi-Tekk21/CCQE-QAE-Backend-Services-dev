import { BadRequestException, HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { groupQuestionStatus } from 'src/common/group_question.status';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Question } from 'src/group-question/entities/question-entities/question.entity';
import { QuestionAnswerOp } from 'src/group-question/entities/question-answer-option-entities/question_answerOP.entity';
import { AnswerOptionLookup } from 'src/answer-option-lookup/entities/answer-option-lookup.entity';
import { QuestionLookup } from 'src/question-lookup/entities/question-lookup.entity';
import { Catagory } from 'src/catagory/entities/catagory.entity';
import { GroupQuestion } from './entities/group-question-entities/group-question.entity';
import { VersionChangesDetail } from './entities/version-changes-detail.entity';
import { UpdateGroupQuestionDto } from './dto/group-question-dto/update-group-question.dto';
import { CreateGroupQuestionDto } from './dto/group-question-dto/create-group-question.dto';
import { DeletQueOrAnsOpDto } from './dto/del-que-or-ansop-dto/delet-queOrAnsOp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate } from 'src/common/utils/paginate';

@Injectable()
export class GroupQuestionService {
  constructor(
    @InjectRepository(GroupQuestion)
    private readonly groupQuestionRepo: Repository<GroupQuestion>,

    private readonly dataSource: DataSource,
  ) { }

  private async validateGroupQuestionCreation(
    entityManager: EntityManager,
    createGroupQuestionDto: CreateGroupQuestionDto,
  ): Promise<void> {
    // 1. Check if an active GroupQuestion already exists.
    const doesActiveExist = await entityManager.findOne(GroupQuestion, {
      where: { is_active: true, is_deleted: false },
    });
    if (doesActiveExist) {
      throw new HttpException(
        "You can't create a new group question before the active one is completed.",
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Check for an existing GroupQuestion for the current month.
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
  }

  private async createAndSaveGroupQuestion(
    entityManager: EntityManager,
    createGroupQuestionDto: CreateGroupQuestionDto,
  ): Promise<GroupQuestion> {
    // Determine the version
    const max = await entityManager
      .createQueryBuilder(GroupQuestion, 'group_question')
      .select('MAX(group_question.version)', 'max')
      .getRawOne();

    // Calculate sum of question weights
    let sumOfQuestionWeights = 0;
    if (createGroupQuestionDto.questions && createGroupQuestionDto.questions.length > 0) {
      for (const queData of createGroupQuestionDto.questions) {
        sumOfQuestionWeights += queData.weight;
      }
    }

    // Create the GroupQuestion entity instance in memory.
    const createdByUserId = createGroupQuestionDto.created_by;
    const currentDate = new Date();
    const month = currentDate.toLocaleString('en-US', { month: 'short' });
    const year = currentDate.getFullYear().toString();
    const groupQuestionName = `${month}/${year}/EP`;

    let group_question = entityManager.create(GroupQuestion, createGroupQuestionDto);
    group_question.name = groupQuestionName;
    group_question.status = groupQuestionStatus.DRAFT;
    group_question.created_by = createdByUserId;
    group_question.evaluation_ends_at = createGroupQuestionDto.evaluation_ends_at;
    group_question.version = (Number(max.max || 0) + 0.1).toFixed(1);
    group_question.weight = sumOfQuestionWeights;

    // Save the GroupQuestion and return the managed instance.
    return await entityManager.save(GroupQuestion, group_question);
  }

  private findRemovedQuestions(
    parentQuestionMap: Map<string, any>,
    currentQuestionMap: Map<string, any>,
  ): { content: string }[] {
    const removed: { content: string }[] = [];
    for (const parentQ of parentQuestionMap.values()) {
      if (!currentQuestionMap.has(parentQ.question_lookup.content)) {
        removed.push({ content: parentQ.question_lookup.content });
      }
    }
    return removed;
  }

  private findAddedAndModifiedQuestions(
    parentQuestionMap: Map<string, any>,
    currentQuestions: any[],
  ): {
    added: { content: string; weight: number }[];
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
  } {
    const added: { content: string; weight: number }[] = [];
    const modified: any[] = [];

    for (const currentQ of currentQuestions) {
      const parentQ = parentQuestionMap.get(currentQ.content);

      if (!parentQ) {
        // New question
        added.push({ content: currentQ.content, weight: currentQ.weight });
      } else {
        // Check for modifications
        const modifiedQuestion = this.findQuestionModifications(parentQ, currentQ);
        if (modifiedQuestion) {
          modified.push(modifiedQuestion);
        }
      }
    }

    return { added, modified };
  }

  private findQuestionModifications(
    parentQ: any,
    currentQ: any
  ): {
    content: string;
    changes: {
      questionWeight?: { from: number; to: number };
      answerOptions?: {
        added: { content: string; weight: number }[];
        removed: { content: string; weight: number }[];
        modified: { content: string; weight: { from: number; to: number } }[];
      };
    };
  } | null {
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
    } = { content: currentQ.content, changes: {} };
    let isModified = false;

    if (currentQ.weight !== parentQ.weight) {
      modifiedQuestion.changes.questionWeight = { from: parentQ.weight, to: currentQ.weight };
      isModified = true;
    }

    const answerOptions = currentQ.question_answer_option || currentQ.updated_question_answer_option;
    const answerOpChanges = this.compareAnswerOptions(parentQ.question_answer_option, answerOptions);

    if (answerOpChanges.added.length > 0 || answerOpChanges.removed.length > 0 || answerOpChanges.modified.length > 0) {
      modifiedQuestion.changes.answerOptions = answerOpChanges;
      isModified = true;
    }

    return isModified ? modifiedQuestion : null;
  }

  private compareQuestionsAndGenerateChanges(
    parentQuestions: any[],
    currentQuestions: any[],
  ): {
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
  } {
    const parentQuestionMap = new Map(parentQuestions.map(q => [q.question_lookup.content, q]));
    const currentQuestionMap = new Map(currentQuestions.map(q => [q.content, q]));

    const removed = this.findRemovedQuestions(parentQuestionMap, currentQuestionMap);
    const { added, modified } = this.findAddedAndModifiedQuestions(parentQuestionMap, currentQuestions);

    return { added, removed, modified };
  }

  private compareAnswerOptions(parentOps: any[], currentOps: any[]): {
    added: { content: string; weight: number }[];
    removed: { content: string; weight: number }[];
    modified: { content: string; weight: { from: number; to: number } }[];
  } {
    const changes: {
      added: { content: string; weight: number }[];
      removed: { content: string; weight: number }[];
      modified: { content: string; weight: { from: number; to: number } }[];
    } = { added: [], removed: [], modified: [] };
    const parentAnswerOpsMap = new Map((parentOps || []).map(qao => [qao.answer_option_lookup.content, qao]));
    const currentAnswerOpsMap = new Map((currentOps || []).map(qao => [qao.content, qao]));

    // Check for added, removed, and modified answer options
    for (const [content, currentQao] of currentAnswerOpsMap) {
      const parentQao = parentAnswerOpsMap.get(content);
      if (!parentQao) {
        changes.added.push({ content: content, weight: currentQao.weight });
      } else if (currentQao.weight !== parentQao.weight) {
        changes.modified.push({ content: content, weight: { from: parentQao.weight, to: currentQao.weight } });
      }
    }

    for (const [content, parentQao] of parentAnswerOpsMap) {
      if (!currentAnswerOpsMap.has(content)) {
        changes.removed.push({ content, weight: parentQao.weight });
      }
    }

    return changes;
  }

  private async handleParentAndVersionChanges(
    entityManager: EntityManager,
    savedGroupQuestion: GroupQuestion,
    groupQuestionDto: CreateGroupQuestionDto | UpdateGroupQuestionDto,
  ): Promise<void> {
    if (!groupQuestionDto.parentId) {
      return;
    }

    const parent = await entityManager.findOne(GroupQuestion, {
      where: { id: groupQuestionDto.parentId },
      relations: ['question', 'question.question_lookup', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
    });

    if (!parent) {
      throw new HttpException('Parent group question not found.', HttpStatus.NOT_FOUND);
    }

    savedGroupQuestion.parent = parent;

    // Support both Create and Update DTOs for questions property
    const questions = (groupQuestionDto as any).questions ?? (groupQuestionDto as any).updated_questions;

    const changes = this.compareQuestionsAndGenerateChanges(parent.question, questions);

    const currentDate = new Date();
    const month = currentDate.toLocaleString('en-US', { month: 'short' });
    const year = currentDate.getFullYear().toString();

    const versionChangesDetail = entityManager.create(VersionChangesDetail, {
      group_question: savedGroupQuestion,
      year: year,
      month: month,
      changed_question_detail: changes,
    });

    await entityManager.save(versionChangesDetail);
    await entityManager.save(GroupQuestion, savedGroupQuestion);
  }

  private async processNestedQuestions(
    entityManager: EntityManager,
    savedGroupQuestion: GroupQuestion,
    questionsDto: any[], // Use a more specific DTO type here if available
  ): Promise<void> {
    if (!questionsDto || questionsDto.length === 0) {
      return; // No questions to process
    }

    for (const queData of questionsDto) {
      // Find or create QuestionLookup
      let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: queData.content } });
      if (!questionLookup) {
        questionLookup = entityManager.create(QuestionLookup, { content: queData.content, created_by: queData.created_by, is_deleted: false });
        await entityManager.save(QuestionLookup, questionLookup);
      }

      // Find Category
      const catagoryEntity = await entityManager.findOne(Catagory, { where: { id: queData.catagoryId } });
      if (!catagoryEntity) {
        throw new HttpException('Catagory not found.', HttpStatus.NOT_FOUND);
      }

      // Create and save new Question
      const newQuestion = entityManager.create(Question, {
        content: queData.content,
        catagory: catagoryEntity,
        group_question: savedGroupQuestion,
        question_lookup: questionLookup,
        is_deleted: false,
        created_by: queData.created_by,
        weight: queData.weight,
      });
      await entityManager.save(Question, newQuestion);

      // Process and save nested Answer Options
      const createdQAO: QuestionAnswerOp[] = [];
      for (const ansData of queData.question_answer_option) {
        let answerOption = await entityManager.findOne(AnswerOptionLookup, { where: { content: ansData.content } });
        if (!answerOption) {
          answerOption = entityManager.create(AnswerOptionLookup, { content: ansData.content, created_by: queData.created_by, is_deleted: false });
          await entityManager.save(AnswerOptionLookup, answerOption);
        }

        const qao = entityManager.create(QuestionAnswerOp, {
          question: newQuestion,
          answer_option_lookup: answerOption,
          weight: ansData.weight,
          is_deleted: false,
          created_by: queData.created_by,
        });
        createdQAO.push(qao);
        await entityManager.save(QuestionAnswerOp, qao);
      }

      // Update question with created answer options and group question
      newQuestion.question_answer_option = createdQAO;
      await entityManager.save(Question, newQuestion);

      // Update the savedGroupQuestion with the new question
      if (!savedGroupQuestion.question) {
        savedGroupQuestion.question = [];
      }
      savedGroupQuestion.question.push(newQuestion);
      await entityManager.save(GroupQuestion, savedGroupQuestion);
    }
  }

  async create(createGroupQuestionDto: CreateGroupQuestionDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const entityManager: EntityManager = queryRunner.manager;

    try {
      // step 1
      await this.validateGroupQuestionCreation(entityManager, createGroupQuestionDto);  // checked and working
      // step 2
      const savedGroupQuestion = await this.createAndSaveGroupQuestion(entityManager, createGroupQuestionDto);

      // step 3, but isolated and to be checked later
      if (createGroupQuestionDto.parentId) {
        await this.handleParentAndVersionChanges(entityManager, savedGroupQuestion, createGroupQuestionDto);
      } else {
        savedGroupQuestion.parent = null;
      }

      // Step 4: Process and save all nested questions and answer options
      await this.processNestedQuestions(entityManager, savedGroupQuestion, createGroupQuestionDto.questions);

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

  async findAll(page: number, limit: number, sortOrder: 'ASC' | 'DESC' = 'DESC'): Promise<{
    success: boolean,
    "group questions": GroupQuestion[],
    meta: {}
  }> {
    try {

      const paginatedGroupQuestions = await paginate(
        this.groupQuestionRepo,
        page,
        limit,
        {
          relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
          order: { created_at: sortOrder }
        }
      );
      return {
        success: true,
        "group questions": paginatedGroupQuestions.data,
        meta: paginatedGroupQuestions.meta
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

  private async processUpdatedQuestions(
    entityManager: EntityManager,
    groupQuestion: GroupQuestion,
    updatedQuestionsDto: any[],
    updatedByUserId: string,
  ): Promise<void> {
    const existingQuestionsMap = new Map((groupQuestion.question || []).map(q => [q.id, q]));
    const questionsToSave: Question[] = [];
    console.log(questionsToSave);

    // First pass: Process updates and new creations
    for (const dtoQ of updatedQuestionsDto) {
      let questionEntity: Question;

      if (dtoQ.id) {
        // Update an existing question
        questionEntity = await this.updateExistingQuestion(entityManager, groupQuestion, dtoQ, updatedByUserId, existingQuestionsMap);
        existingQuestionsMap.delete(dtoQ.id); // Mark as processed
      } else {
        // Create a new question
        questionEntity = await this.createNewQuestion(entityManager, groupQuestion, dtoQ, updatedByUserId);
        if (!groupQuestion.question) {
          groupQuestion.question = [];
        }
        groupQuestion.question.push(questionEntity);
      }

      // Process answer options for the current question
      const qaosToSave = await this.processQuestionAnswerOptions(entityManager, questionEntity, dtoQ.updated_question_answer_option, updatedByUserId);
      questionEntity.question_answer_option = qaosToSave;
      questionsToSave.push(questionEntity);
    }

    // Second pass: delete questions that were removed from the DTO
    const questionsToDelete = Array.from(existingQuestionsMap.values());
    if (questionsToDelete.length > 0) {
      await entityManager.remove(questionsToDelete);
      // Update the in-memory array to reflect the deletion
      groupQuestion.question = groupQuestion.question.filter(
        q => !questionsToDelete.some(deletedQ => deletedQ.id === q.id)
      );
    }

    // Save all changes at once for efficiency (if applicable)
    // Note: The original code saved within the loop. This can be optimized, but let's stick to the core refactoring first.
    // We'll leave the saves inside the helper methods to match the original logic.
  }

  private async updateExistingQuestion(
    entityManager: EntityManager,
    groupQuestion: GroupQuestion,
    dtoQ: any,
    updatedByUserId: string,
    existingQuestionsMap: Map<string, Question>,
  ): Promise<Question> {
    if (!existingQuestionsMap.has(dtoQ.id)) {
      throw new NotFoundException(`Question with ID "${dtoQ.id}" not found in this group.`);
    }

    const questionEntity = existingQuestionsMap.get(dtoQ.id);

    if (!questionEntity) {
      throw new NotFoundException(`Question with ID "${dtoQ.id}" not found in this group.`);
    }
    // Check and update question lookup if content changes
    if (dtoQ.content && dtoQ.content !== questionEntity.question_lookup.content) {
      let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: dtoQ.content } });
      if (!questionLookup) {
        questionLookup = entityManager.create(QuestionLookup, { content: dtoQ.content, created_by: updatedByUserId, is_deleted: false });
        await entityManager.save(QuestionLookup, questionLookup);
      }
      questionEntity.question_lookup = questionLookup;
    }

    entityManager.merge(Question, questionEntity, dtoQ);

    if (dtoQ.catagoryId) {
      const catagoryEntity = await entityManager.findOne(Catagory, { where: { id: dtoQ.catagoryId } });
      if (!catagoryEntity) {
        throw new HttpException(`Category with ID "${dtoQ.catagoryId}" not found for question "${dtoQ.content}".`, HttpStatus.NOT_FOUND);
      }
      questionEntity.catagory = catagoryEntity;
    }


    await entityManager.save(Question, questionEntity);
    return questionEntity;
  }

  private async createNewQuestion(
    entityManager: EntityManager,
    groupQuestion: GroupQuestion,
    dtoQ: any,
    updatedByUserId: string,
  ): Promise<Question> {
    const questionData = { ...dtoQ };
    delete questionData.id;

    let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: dtoQ.content } });
    if (!questionLookup) {
      questionLookup = entityManager.create(QuestionLookup, { content: dtoQ.content, created_by: updatedByUserId, is_deleted: false });
      await entityManager.save(QuestionLookup, questionLookup);
    }
    const catagory = await entityManager.findOne(Catagory, { where: { id: dtoQ.catagoryId } })
    if (!catagory) {
      throw new NotFoundException(`catagory ${dtoQ.catagoryId} not found`)
    }
    const newQuestion = entityManager.create(Question, {
      ...questionData,
      catagory: catagory,
      group_question: groupQuestion,
      question_lookup: questionLookup,
      created_by: updatedByUserId || groupQuestion.created_by,
      is_deleted: false,
    });

    await entityManager.save(Question, newQuestion);
    return newQuestion;
  }

  private async processQuestionAnswerOptions(
    entityManager: EntityManager,
    questionEntity: Question | undefined,
    updatedQaoDto: any[],
    updatedByUserId: string,
  ): Promise<QuestionAnswerOp[]> {
    if (!questionEntity) {
      throw new Error('questionEntity is undefined');
    }

    const existingQaoMap = new Map((questionEntity.question_answer_option || []).map(qao => [qao.answer_option_lookup?.content, qao]));
    const qaosToSave: QuestionAnswerOp[] = [];

    for (const dtoQao of updatedQaoDto) {
      let qaoEntity: QuestionAnswerOp;
      const existingQao = existingQaoMap.get(dtoQao.content);

      if (existingQao) {
        // Update existing QAO
        qaoEntity = existingQao;
        entityManager.merge(QuestionAnswerOp, qaoEntity, dtoQao);
      } else {
        // Create a new QAO and its lookup
        let answerOptionLookup = await entityManager.findOne(AnswerOptionLookup, { where: { content: dtoQao.content } });
        if (!answerOptionLookup) {
          answerOptionLookup = entityManager.create(AnswerOptionLookup, { content: dtoQao.content, created_by: updatedByUserId, is_deleted: false });
          await entityManager.save(AnswerOptionLookup, answerOptionLookup);
        }

        qaoEntity = entityManager.create(QuestionAnswerOp, {
          ...dtoQao,
          question: questionEntity,
          answer_option_lookup: answerOptionLookup,
          is_deleted: false,
        });
      }
      await entityManager.save(QuestionAnswerOp, qaoEntity);
      qaosToSave.push(qaoEntity);
      if (existingQao) {
        existingQaoMap.delete(dtoQao.content);
      }
    }

    const answerOpstoDel = Array.from(existingQaoMap.values());
    if (answerOpstoDel.length > 0) {
      await entityManager.remove(answerOpstoDel);
      // Update the in-memory array to reflect the deletion
      questionEntity.question_answer_option = questionEntity.question_answer_option.filter(
        qao => !answerOpstoDel.some(deletedQAO => deletedQAO.id === qao.id)
      );
    }

    return qaosToSave;
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

    try {
      let groupQuestion = await entityManager.findOne(GroupQuestion, {
        where: { id },
        relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
      });

      if (!groupQuestion) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      }

      // Apply top-level updates to the GroupQuestion entity
      entityManager.merge(GroupQuestion, groupQuestion, updateGroupQuestionDto);
      groupQuestion.updated_at = new Date();
      groupQuestion.updated_by = updateGroupQuestionDto.updated_by;

      // Process all nested questions (creation, update, and delete)
      await this.processUpdatedQuestions(entityManager, groupQuestion, updateGroupQuestionDto.updated_questions, updateGroupQuestionDto.updated_by);

      // Recalculate and update the total weight
      const allQuestions = await entityManager.find(Question, { where: { group_question: { id: groupQuestion.id } } });
      groupQuestion.weight = allQuestions.filter(q => !q.is_deleted).reduce((sum, q) => sum + q.weight, 0);

      // Handle parent tracking and versioning (re-using the method from the `create` refactor)
      await this.handleParentAndVersionChanges(entityManager, groupQuestion, updateGroupQuestionDto);

      await entityManager.save(GroupQuestion, groupQuestion);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Group question with ID "${id}" updated successfully.`,
        "updated group question": groupQuestion,
      };

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

      if (gQue.is_active) {
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
      } else {
        throw new HttpException(
          'Failed to delete group question due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

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
      } else {
        throw new HttpException(
          'Failed to undo delete group question due to an unexpected error.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    } finally {
      await queryRunner.release();
    }
  }

  async deleteQueOrAnsOPs(id: string, deletQueOrAnsOpDto: DeletQueOrAnsOpDto) {

    const createupdateDto: UpdateGroupQuestionDto = {
      updated_by: '',
      updated_questions: []
    };

    // 
    try {
      const { ['group question']: groupQuestion } = await this.findOne(id)
      createupdateDto.evaluation_ends_at = groupQuestion.evaluation_ends_at;
      createupdateDto.updated_by = deletQueOrAnsOpDto.deletedBy;
      createupdateDto.parentId = groupQuestion.parent

      const taregtQuestion = groupQuestion.question.some(q => q.id === deletQueOrAnsOpDto.questionId);
      if (!taregtQuestion) {
        throw new NotFoundException(`question with id ${deletQueOrAnsOpDto.questionId} not found under group question with id ${id}`)
      }

      groupQuestion.question.forEach((queData, i) => {
        createupdateDto.updated_questions[i] = {
          id: queData.id,
          content: queData.question_lookup.content,
          weight: queData.weight,
          catagoryId: queData.catagory.id,
          updated_question_answer_option: queData.question_answer_option
            ? queData.question_answer_option.map(ansOp => ({
              id: ansOp.id,
              content: ansOp.answer_option_lookup?.content,
              weight: ansOp.weight
            }))
            : []
        }
      });

      const targetQuestion = createupdateDto.updated_questions.find(
        updatedQuestion => updatedQuestion.id === deletQueOrAnsOpDto.questionId
      );
      // the user wantes to delete answer option under specified question
      if (deletQueOrAnsOpDto.AnswerOptions.length > 0) {
        for (const ansOpId of deletQueOrAnsOpDto.AnswerOptions) {
          const isTrue = createupdateDto.updated_questions.find(updatedQuestion =>
            updatedQuestion.id === deletQueOrAnsOpDto.questionId)?.updated_question_answer_option.some(qao =>
              qao.id === ansOpId
            )
          if (!isTrue) {
            throw new NotFoundException(`answer option ${ansOpId} is not found under question ${deletQueOrAnsOpDto.questionId}`)
          }

          if (targetQuestion) {
            targetQuestion.updated_question_answer_option = targetQuestion.updated_question_answer_option.filter(
              qao => qao.id !== ansOpId
            );
          }
        }
      }
      else {
        createupdateDto.updated_questions = createupdateDto.updated_questions.filter(
          updatedQuestion => updatedQuestion.id !== deletQueOrAnsOpDto.questionId
        );
      }

      const { ['updated group question']: updatedGroupQuestion } = await this.update(id, createupdateDto)
      return {
        success: true,
        message: `Group question with ID "${id}" updated successfully.`,
        "updated group question": updatedGroupQuestion,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException("Error occurred during deleting question");
    }
  }

  async getActiveGroupQuestion() {
    const groupQuestion = await this.groupQuestionRepo.findOne({
      where: {
        is_active: true
      },
      relations: ['question', 'question.question_lookup', 'question.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup', 'parent'],
    })

    if (!groupQuestion) {
      throw new NotFoundException("no active group question is found !")
    }
    return {
      groupQuestion
    }
  }
}
