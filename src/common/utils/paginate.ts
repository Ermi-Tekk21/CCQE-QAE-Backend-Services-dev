import { Repository, SelectQueryBuilder } from 'typeorm';


export async function paginate<T extends import('typeorm').ObjectLiteral>(
    query: Repository<T> | SelectQueryBuilder<T>,
    page: number,
    limit: number,
    sort: 'DESC' | 'ASC' = 'DESC'
) {
    const skip = (page - 1) * limit;

    let queryBuilder: SelectQueryBuilder<T>;
    if (query instanceof Repository) {
        queryBuilder = query.createQueryBuilder();
    } else {
        queryBuilder = query;
    }

    const [data, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('created_at', sort)
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
