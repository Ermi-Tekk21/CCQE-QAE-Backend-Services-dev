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

    const alias = queryBuilder.expressionMap.mainAlias!.name;

    if (options?.where) {
        queryBuilder.where(options.where);
    }

    if (options?.relations) {
        const relations = Array.isArray(options.relations) ? options.relations : Object.keys(options.relations);
        relations.forEach(relation => {
            const relationParts = relation.split('.');
            let currentAlias = alias;
            let propertyPath = '';

            relationParts.forEach((part, index) => {
                propertyPath += (index === 0 ? '' : '.') + part;
                const newAlias = `${currentAlias}_${part}`;
                const existingJoin = queryBuilder.expressionMap.joinAttributes.find(
                    join => join.alias.name === newAlias
                );

                if (!existingJoin) {
                    queryBuilder.leftJoinAndSelect(`${currentAlias}.${part}`, newAlias);
                }
                currentAlias = newAlias;
            });
        });
    }

    if (options?.order) {
        const order = options.order as { [key: string]: 'asc' | 'desc' };
        Object.keys(order).forEach(key => {
            queryBuilder.addOrderBy(`${alias}.${key}`, order[key].toUpperCase() as 'ASC' | 'DESC');
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
