import { BadRequestException, ConflictException, forwardRef, HttpException, HttpStatus, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import { paginate } from 'src/utils/paginate';
import { agentEvalStatus } from 'src/common/agent_evaluation.status';
import { CreateQuestionAnswerOPDto } from './dto/question-and-answer-option-dto/create-question_answerOP.dto';
import { CreateQuestionDto } from './dto/question-dto/create-question.dto';
import nodeCron from 'node-cron';
import { UUID } from 'crypto';
import { AgentEvaluation } from 'src/evaluation/entities/evaluation.entity';
import { appealStatus } from 'src/common/appeal.status';
import { Appeal } from 'src/appeal/entities/appeal.entity';
import { audioStatus } from 'src/common/audio.status';
import { EvaluationService } from 'src/evaluation/evaluation.service';
import { UpdateQuestionDto } from './dto/question-dto/update-question.dto';
import { UpdateQuestionAnswerOPDto } from './dto/question-and-answer-option-dto/update-question-answerOP.dto';

@Injectable()
export class GroupQuestionService {
  constructor(
    @InjectRepository(GroupQuestion)
    private readonly groupQuestionRepo: Repository<GroupQuestion>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,

    @Inject(forwardRef(() => EvaluationService))
    private readonly evaluationService: EvaluationService,

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
      // check for end date, if current date exceedes the active group question endsat date, close it
      // Use Ethiopia timezone (EAT/UTC+3) for current date
      const currentDate = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
      );

      if (currentDate < new Date(doesActiveExist.evaluation_ends_at)) {
        throw new HttpException(
          `You can't create a new group question before the active one is completed. The current active group question "${doesActiveExist.name}" is still ongoing and its evaluation period ends at ${doesActiveExist.evaluation_ends_at}. Please wait until it is closed before creating a new one.`,
          HttpStatus.BAD_REQUEST,
        );
      } else {
        await this.close()
      }
    }

    // 2. Check for an existing GroupQuestion for the current month.
    // Use Ethiopia timezone (EAT/UTC+3) for current date
    const currentDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    );
    // Set to previous month for group question naming
    const previousMonthDate = new Date(currentDate);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const month = previousMonthDate.toLocaleString('en-US', { month: 'short' });
    const year = previousMonthDate.getFullYear().toString();
    const groupQuestionName = `${month}/${year}/EP`;

    const dayDifference = (createGroupQuestionDto.evaluation_ends_at.getDate() - currentDate.getDate());
    if (dayDifference > 10) {
      throw new BadRequestException(
        `Invalid evaluation end date: the difference between today's date (${currentDate.toDateString()}) and the evaluation end date (${createGroupQuestionDto.evaluation_ends_at.toDateString()}) is ${dayDifference} days, which exceeds the allowed maximum of 10 days. Please ensure the evaluation period does not exceed 10 days from the current date.`
      );
    }

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
    user_id: string
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
    // const createdByUserId = createGroupQuestionDto.created_by;
    const currentDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    );
    // Set to previous month for group question naming
    const previousMonthDate = new Date(currentDate);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const month = previousMonthDate.toLocaleString('en-US', { month: 'short' });
    const year = previousMonthDate.getFullYear().toString();
    const groupQuestionName = `${month}/${year}/EP`;

    let group_question = entityManager.create(GroupQuestion, createGroupQuestionDto);
    group_question.name = groupQuestionName;
    group_question.status = groupQuestionStatus.DRAFT;
    group_question.created_by = user_id;
    group_question.updated_at = null;
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
    currentDate.setMonth(currentDate.getMonth() - 1);
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

  private validateQuestionAnsOP(ansOpData: CreateQuestionAnswerOPDto, question: CreateQuestionDto) {
    if (ansOpData.weight > question.weight) {
      throw new BadRequestException(
        `Invalid weight for answer option '${ansOpData.content}': its weight (${ansOpData.weight}) must not exceed the weight of its parent question '${question.content}' (${question.weight}). Please ensure answer option weights are less than or equal to their parent question's weight.`
      );
    }
  }

  private async processNestedQuestions(
    entityManager: EntityManager,
    savedGroupQuestion: GroupQuestion,
    questionsDto: CreateQuestionDto[], // Use a more specific DTO type here if available
    user_id: string,
  ): Promise<void> {
    if (!questionsDto || questionsDto.length === 0) {
      return; // No questions to process
    }

    const sumOfQuestionWeights = questionsDto.reduce((sum, question) => sum + question.weight, 0);
    if (sumOfQuestionWeights > 100) {
      console.error('group question exceedes 100; ', sumOfQuestionWeights);
      throw new BadRequestException(
        `Invalid total weight for group question: the sum of all question weights is ${sumOfQuestionWeights}, which exceeds the allowed maximum of 100. Please adjust the weights so that the total does not surpass 100 before creating the group question.`
      );
    }

    for (const queData of questionsDto) {
      // Find or create QuestionLookup
      let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: queData.content } });
      // Find Category
      const catagoryEntity = await entityManager.findOne(Catagory, { where: { id: queData.catagoryId } });
      if (!catagoryEntity) {
        throw new HttpException(
          `Category with ID "${queData.catagoryId}" referenced by question "${queData.content}" was not found. Please verify that the category exists and is not soft-deleted, or create the category first and provide its ID before creating this question.`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (!questionLookup) {
        questionLookup = entityManager.create(QuestionLookup, { content: queData.content, catagory: catagoryEntity, created_by: user_id, is_deleted: false });
        await entityManager.save(QuestionLookup, questionLookup);
      }

      // Create and save new Question
      const newQuestion = entityManager.create(Question, {
        content: queData.content,
        group_question: savedGroupQuestion,
        question_lookup: questionLookup,
        is_deleted: false,
        created_by: user_id,
        weight: queData.weight,
      });
      await entityManager.save(Question, newQuestion);

      // Process and save nested Answer Options
      const createdQAO: QuestionAnswerOp[] = [];
      for (const ansData of queData.question_answer_option) {
        this.validateQuestionAnsOP(ansData, queData)
        let answerOption = await entityManager.findOne(AnswerOptionLookup, { where: { content: ansData.content } });
        if (!answerOption) {
          answerOption = entityManager.create(AnswerOptionLookup, { content: ansData.content, created_by: user_id, is_deleted: false });
          await entityManager.save(AnswerOptionLookup, answerOption);
        }

        const qao = entityManager.create(QuestionAnswerOp, {
          question: newQuestion,
          answer_option_lookup: answerOption,
          weight: ansData.weight,
          is_deleted: false,
          created_by: user_id,
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

  async create(createGroupQuestionDto: CreateGroupQuestionDto, user_id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const entityManager: EntityManager = queryRunner.manager;

    try {
      // step 1
      await this.validateGroupQuestionCreation(entityManager, createGroupQuestionDto);  // checked and working
      // step 2
      const savedGroupQuestion = await this.createAndSaveGroupQuestion(entityManager, createGroupQuestionDto, user_id);

      // step 3, but isolated and to be checked later
      if (createGroupQuestionDto.parentId) {
        await this.handleParentAndVersionChanges(entityManager, savedGroupQuestion, createGroupQuestionDto);
      } else {
        savedGroupQuestion.parent = null;
      }

      // Step 4: Process and save all nested questions and answer options
      await this.processNestedQuestions(entityManager, savedGroupQuestion, createGroupQuestionDto.questions, user_id);
      savedGroupQuestion.updated_at = null
      await entityManager.save(GroupQuestion, savedGroupQuestion)

      const responseData = {
        ...savedGroupQuestion,
        parent: savedGroupQuestion.parent ? savedGroupQuestion.parent.id : null,
      };

      const { cronJobsMessage, deadline } = this.forceCloseWithCronJobs(savedGroupQuestion.id as UUID, savedGroupQuestion.evaluation_ends_at)
      console.log(cronJobsMessage);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Group question created successfully. ${cronJobsMessage}`,
        deadline,
        group_question: responseData
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(error);
      if (error instanceof HttpException ||
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      else {
        throw new InternalServerErrorException('Failed to create group question due to an unexpected error.')
      }
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(page: number, limit: number, sortOrder: 'asc' | 'desc' = 'desc'): Promise<{
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
          relations: ['question', 'question.question_lookup', 'question.question_lookup.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
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

  async findAllQuestionUnderSpecGroupQue(
    params: {
      page: number;
      limit: number;
      catagory: string;
      search: string;
      sortOrder: 'asc' | 'desc';
    },
    id: string,
  ) {
    try {
      const { page, limit, catagory, search, sortOrder } = params;

      const queryBuilder = this.questionRepo
        .createQueryBuilder('question')
        .leftJoinAndSelect('question.group_question', 'group_question')
        .leftJoinAndSelect('question.question_lookup', 'question_lookup')
        .leftJoinAndSelect('question_lookup.catagory', 'catagory')
        .where('group_question.id = :id', { id });

      if (catagory) {
        queryBuilder.andWhere('catagory.name ILIKE :catagory', {
          catagory: `%${catagory}%`,
        });
      }

      if (search) {
        queryBuilder.andWhere('question_lookup.content ILIKE :search', {
          search: `%${search}%`,
        });
      }

      const paginatedResult = await paginate(queryBuilder, page, limit, {
        order: { created_at: sortOrder },
      });

      return {
        success: true,
        questions: paginatedResult.data,
        meta: paginatedResult.meta,
      };
    } catch (error) {
      console.error(
        'Error finding all questions under a specific group question:',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve questions for the specified group.',
      );
    }
  }

  async findOne(id: string) {
    try {
      const gQue = await this.dataSource.manager.findOne(GroupQuestion, {
        where: { id: id },
        relations: ['question', 'question.question_lookup', 'question.question_lookup.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup', 'parent'],
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
    updatedQuestionsDto: UpdateQuestionDto[],
    user_id: string,
  ): Promise<void> {
    const existingQuestionsMap = new Map((groupQuestion.question || []).map(q => [q.id, q]));
    const questionsToSave: Question[] = [];

    const sumOfQuestionWeights = updatedQuestionsDto.reduce((sum, question) => sum + question.weight, 0);
    if (sumOfQuestionWeights > 100) {
      console.error('group question exceedes 100; ', sumOfQuestionWeights);
      throw new BadRequestException(
        `Invalid total weight for group question: the sum of all question weights is ${sumOfQuestionWeights}, which exceeds the allowed maximum of 100. Please adjust the weights so that the total does not surpass 100 before creating the group question.`
      );
    }

    // First pass: Process updates and new creations
    for (const dtoQ of updatedQuestionsDto) {

      let questionEntity: Question;

      if (dtoQ.id) {
        // Update an existing question
        questionEntity = await this.updateExistingQuestion(entityManager, groupQuestion, dtoQ, user_id, existingQuestionsMap);
        existingQuestionsMap.delete(dtoQ.id); // Mark as processed
      } else {
        // Create a new question
        questionEntity = await this.createNewQuestion(entityManager, groupQuestion, dtoQ, user_id);
        if (!groupQuestion.question) {
          groupQuestion.question = [];
        }
        groupQuestion.question.push(questionEntity);
      }

      // Process answer options for the current question
      const qaosToSave = await this.processQuestionAnswerOptions(entityManager, questionEntity, dtoQ.updated_question_answer_option, user_id);
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
  }

  private async updateExistingQuestion(
    entityManager: EntityManager,
    groupQuestion: GroupQuestion,
    dtoQ: any,
    user_id: string,
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
    if (dtoQ.content && dtoQ.catagoryId && dtoQ.content !== questionEntity.question_lookup.content) {
      let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: dtoQ.content } });

      const catagoryEntity = await entityManager.findOne(Catagory, { where: { id: dtoQ.catagoryId } });
      if (!catagoryEntity) {
        throw new HttpException(`Category with ID "${dtoQ.catagoryId}" not found for question "${dtoQ.content}".`, HttpStatus.NOT_FOUND);
      }

      if (!questionLookup) {
        questionLookup = entityManager.create(QuestionLookup, { content: dtoQ.content, catagory: catagoryEntity, created_by: user_id, is_deleted: false });
        await entityManager.save(QuestionLookup, questionLookup);
      }
      questionEntity.question_lookup = questionLookup;
      questionEntity.updated_by = user_id;
      questionEntity.updated_at = new Date();
    }

    entityManager.merge(Question, questionEntity, dtoQ);

    return questionEntity;
  }

  private async createNewQuestion(
    entityManager: EntityManager,
    groupQuestion: GroupQuestion,
    dtoQ: any,
    user_id: string,
  ): Promise<Question> {
    const questionData = { ...dtoQ };
    delete questionData.id;

    let questionLookup = await entityManager.findOne(QuestionLookup, { where: { content: dtoQ.content } });
    const catagory = await entityManager.findOne(Catagory, { where: { id: dtoQ.catagoryId } })
    if (!catagory) {
      throw new NotFoundException(`catagory ${dtoQ.catagoryId} not found`)
    }
    if (!questionLookup) {
      questionLookup = entityManager.create(QuestionLookup, { content: dtoQ.content, catagory: catagory, created_by: user_id, is_deleted: false });
      await entityManager.save(QuestionLookup, questionLookup);
    }

    const newQuestion = entityManager.create(Question, {
      ...questionData,
      group_question: groupQuestion,
      question_lookup: questionLookup,
      created_by: user_id || groupQuestion.created_by,
      is_deleted: false,
    });

    await entityManager.save(Question, newQuestion);
    return newQuestion;
  }

  private async processQuestionAnswerOptions(
    entityManager: EntityManager,
    questionEntity: Question | undefined,
    updatedQaoDto: UpdateQuestionAnswerOPDto[],
    user_id: string,
  ): Promise<QuestionAnswerOp[]> {
    if (!questionEntity) {
      throw new Error('questionEntity is undefined');
    }

    const existingQaoMap = new Map((questionEntity.question_answer_option || []).map(qao => [qao.answer_option_lookup?.content, qao]));
    const qaosToSave: QuestionAnswerOp[] = [];

    for (const dtoQao of updatedQaoDto) {
      if (dtoQao.weight > questionEntity.weight) {
        throw new BadRequestException(
          `Invalid weight for answer option '${dtoQao.content}': its weight (${dtoQao.weight}) must not exceed the weight of its parent question '${questionEntity.question_lookup.content}' (${questionEntity.weight}). Please ensure answer option weights are less than or equal to their parent question's weight.`
        );
      }
      let qaoEntity: QuestionAnswerOp;
      const existingQao = existingQaoMap.get(dtoQao.content);

      if (existingQao) {
        // Update existing QAO
        qaoEntity = existingQao;
        qaoEntity.updated_by = user_id
        entityManager.merge(QuestionAnswerOp, qaoEntity, dtoQao);
      } else {
        // Create a new QAO and its lookup
        let answerOptionLookup = await entityManager.findOne(AnswerOptionLookup, { where: { content: dtoQao.content } });
        if (!answerOptionLookup) {
          answerOptionLookup = entityManager.create(AnswerOptionLookup, { content: dtoQao.content, created_by: user_id, is_deleted: false });
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

  async update(id: string, updateGroupQuestionDto: UpdateGroupQuestionDto, user_id: string): Promise<{
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
        relations: ['question', 'question.question_lookup', 'question.question_lookup.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
      });

      if (!groupQuestion) {
        throw new NotFoundException(`Group question with ID "${id}" not found.`);
      }

      if (groupQuestion.status == groupQuestionStatus.CLOSED || groupQuestion.status == groupQuestionStatus.PUBLISHED) {
        throw new BadRequestException('You cannot update a group question that is already published or closed. Only draft group questions can be updated.')
      }
      // Apply top-level updates to the GroupQuestion entity
      entityManager.merge(GroupQuestion, groupQuestion, updateGroupQuestionDto);
      groupQuestion.updated_at = new Date();
      groupQuestion.updated_by = user_id;

      // Process all nested questions (creation, update, and delete)
      await this.processUpdatedQuestions(entityManager, groupQuestion, updateGroupQuestionDto.updated_questions, user_id);

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

  async publish(id: string, user_id: string): Promise<{
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
        gQue.published_at = new Date();
        gQue.published_by = user_id;
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

  async undoPublish() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;

    try {
      const { groupQuestion: gQue } = await this.getActiveGroupQuestion()

      const group_question = await entityManager.findOne(GroupQuestion, {
        where: {
          id: gQue.id
        },
        relations: ['agent_evaluation']
      })

      if (group_question?.agent_evaluation.length !== 0) {
        throw new BadRequestException('you can not undo publish since evaluation associated with this graoup question has started.')
      }
      gQue.is_active = false;
      gQue.published_at = null;
      gQue.published_by = null;
      gQue.status = groupQuestionStatus.DRAFT
      await entityManager.save(GroupQuestion, gQue);
      await queryRunner.commitTransaction();

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
        relations: ['question', 'question.question_lookup', 'question.question_lookup.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup'],
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

  async softDelete(id: string, user_id: string) {
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

      if (gQue.status != groupQuestionStatus.DRAFT) {
        throw new BadRequestException(
          `Group question with ID "${id}" cannot be deleted because its status is "${gQue.status}". Only group questions in DRAFT status can be deleted.`
        );
      }

      await entityManager.softDelete(GroupQuestion, { id: gQue.id });
      gQue.deleted_at = new Date
      gQue.is_deleted = true
      gQue.deleted_by = user_id
      await entityManager.save(GroupQuestion, gQue)

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: "group question temporally deleted successfully",
        "temp deleted group question": gQue
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof HttpException || error instanceof BadRequestException) {
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
      gQue.deleted_by = null
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

  async deleteQueOrAnsOPs(id: string, deletQueOrAnsOpDto: DeletQueOrAnsOpDto, user_id: string) {

    const createupdateDto: UpdateGroupQuestionDto = {
      updated_questions: []
    };

    // 
    try {
      const { ['group question']: groupQuestion } = await this.findOne(id)
      createupdateDto.evaluation_ends_at = groupQuestion.evaluation_ends_at;
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
          catagoryId: queData.question_lookup.catagory.id,
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

      const { ['updated group question']: updatedGroupQuestion } = await this.update(id, createupdateDto, user_id)
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
      relations: ['question', 'question.question_lookup', 'question.question_lookup.catagory', 'question.question_answer_option', 'question.question_answer_option.answer_option_lookup', 'parent'],
    })

    if (!groupQuestion) {
      throw new NotFoundException("no active group question is found !")
    }
    return {
      groupQuestion
    }
  }

  async getCurrentGroupQue() {
    const currentDate = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })
    );

    const previousMonthDate = new Date(currentDate);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const month = previousMonthDate.toLocaleString('en-US', { month: 'short' });
    const year = previousMonthDate.getFullYear().toString();
    const groupQuestionName = `${month}/${year}/EP`;

    const groupQestion = await this.groupQuestionRepo.findOne({
      where: {
        name: groupQuestionName
      }
    })
    return groupQestion
  }

  async close() {
    const { groupQuestion: activeGroupQuestion } = await this.getActiveGroupQuestion()
    const currentDate = new Date();

    if (currentDate < new Date(activeGroupQuestion.evaluation_ends_at)) {
      console.log("current date: ", currentDate);
      console.log("eval end date: ", new Date(activeGroupQuestion.evaluation_ends_at));
      throw new BadRequestException('You cannot close the group question before the evaluation period ends.');
    }

    const groupQuestionDetails = await this.groupQuestionRepo.findOne({
      where: {
        id: activeGroupQuestion.id
      },
      relations: ['agent_evaluation'],
    })

    if (!groupQuestionDetails?.agent_evaluation) {
      throw new BadRequestException('Cannot close the group question because no agent evaluation has been started for this group question.')
    }

    if (groupQuestionDetails.agent_evaluation.some(
      agentEval => {
        const notClosed = agentEval.status != agentEvalStatus.CLOSED;
        if (notClosed) {
          console.log("not completed eval: ", agentEval);
        }
        return notClosed;
      }
    )) {
      throw new BadRequestException('Cannot close the group question because one or more agent evaluations are still in progress or not completed. Please ensure all agent evaluations are marked as completed before closing.')
    }

    activeGroupQuestion.is_active = false;
    activeGroupQuestion.status = groupQuestionStatus.CLOSED
    await this.groupQuestionRepo.save(activeGroupQuestion)
    return {
      success: true,
      message: `Group question "${activeGroupQuestion.name}" has been successfully closed. All agent evaluations are completed and the evaluation period has ended.`
    }
  }

  // group questionId
  async forceCloseGroupQuestion(id: UUID) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const entityManager = queryRunner.manager;
    try {
      const groupQestion = await entityManager.findOne(GroupQuestion, {
        where: {
          id: id,
        },
        relations: [
          'agent_evaluation',
          'agent_evaluation.eval_per_audio',
          'agent_evaluation.eval_per_audio.appeal',
        ],
      });
      if (!groupQestion) {
        throw new NotFoundException(`group question with ID "${id}" not found.`);
      }

      for (const agentEvaluation of groupQestion.agent_evaluation) {
        if (agentEvaluation.status != agentEvalStatus.CLOSED) {
          for (const evalPerAudio of agentEvaluation.eval_per_audio) {
            if (
              evalPerAudio.appeal != null &&
              evalPerAudio.appeal.status != appealStatus.CLOSED
            ) {
              const appeal = evalPerAudio.appeal;
              appeal.status = appealStatus.CLOSED;

              // produce kafka for audio service to notify the servie that the status of this specific audio.
              const message = {
                audio_id: appeal.evaluation_per_audio.audio_id,
                status: audioStatus.CLOSED,
              };
              const { message: audioKafkaMessage } =
                this.evaluationService.UpdateAudioStatus(message);
              console.log(audioKafkaMessage);
              await entityManager.save(Appeal, appeal);
            }
          }
          agentEvaluation.status = agentEvalStatus.CLOSED;
          await entityManager.save(AgentEvaluation, agentEvaluation);
        }
      }
      groupQestion.status = groupQuestionStatus.CLOSED;
      await entityManager.save(GroupQuestion, groupQestion);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error in forceClose:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // if evaluation ends at reached close all evaluation under this group question using cronjobs
  forceCloseWithCronJobs(groupQueId: UUID, evalEndsAtDate: Date) {
    const evalEndDate = new Date(evalEndsAtDate);

    // Extract date components based on the date object's internal timezone (usually UTC/Server Time)
    const cronMinute = 59
    const cronHour = 23
    const cronDay = evalEndDate.getDate();
    const cronMonth = evalEndDate.getMonth() + 1; // cron months are 1-based
    const year = evalEndDate.getFullYear()
    const deadline = `${year}-${String(cronMonth).padStart(2, '0')}-${String(cronDay).padStart(2, '0')} ${String(cronHour).padStart(2, '0')}:${String(cronMinute).padStart(2, '0')} (24hr format) (EAT timezone)`

    // Cron expression to run on the exact date/time *every year*
    const cronExpression = `${cronMinute} ${cronHour} ${cronDay} ${cronMonth} *`;

    // **Specify the Timezone for Ethiopia (EAT/UTC+3)**
    const timezone = 'Africa/Addis_Ababa';

    const task = nodeCron.schedule(cronExpression, async () => {
      console.log(`Executing scheduled force closure for ${groupQueId} (EAT)...`);
      await this.forceCloseGroupQuestion(groupQueId);
      task.stop();
      console.log(`Cron job for ${groupQueId} successfully executed and stopped.`);

    }, {
      timezone: timezone
    });

    // Enhance: Provide feedback if cron job scheduling fails or is already scheduled
    if (!task) {
      return {
        deadline,
        cronJobsMessage: `Failed to schedule automatic closure for group question with ID "${groupQueId}".`
      };
    }

    return {
      deadline,
      cronJobsMessage: `Scheduled automatic closure for group question with ID "${groupQueId}" at ${deadline} (EAT timezone).`
    };
  }

}
