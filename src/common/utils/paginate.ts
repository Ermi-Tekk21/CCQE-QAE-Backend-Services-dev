import { FindManyOptions, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

export async function paginate<T extends ObjectLiteral>(
    repositoryOrQueryBuilder: Repository<T> | SelectQueryBuilder<T>,
    page: number,
    limit: number,
    options?: FindManyOptions<T>
) {
    const skip = (page - 1) * limit;

    let queryBuilder: SelectQueryBuilder<T>;

    if (repositoryOrQueryBuilder instanceof Repository) {
        queryBuilder = repositoryOrQueryBuilder.createQueryBuilder('entity');
    } else {
        queryBuilder = repositoryOrQueryBuilder;
    }

    if (options?.where) {
        queryBuilder.where(options.where);
    }

    if (options?.relations) {
        if (Array.isArray(options.relations)) {
            options.relations.forEach(relation => {
                queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
            });
        } else {
            Object.keys(options.relations).forEach(relation => {
                queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
            });
        }
    }

    if (options?.order) {
        const order = options.order as { [key: string]: 'ASC' | 'DESC' };
        Object.keys(order).forEach(key => {
            queryBuilder.addOrderBy(`entity.${key}`, order[key]);
        });
    }

    const [data, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}
