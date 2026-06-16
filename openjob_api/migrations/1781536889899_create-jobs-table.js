/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('jobs', {
        id: {
            type: 'VARCHAR(36)',
            primaryKey: true,
        },
        company_id: {
            type: 'VARCHAR(36)',
            notNull: true,
            references: '"companies"(id)',
            onDelete: 'CASCADE',
        },
        category_id: {
            type: 'VARCHAR(36)',
            references: '"categories"(id)',
            onDelete: 'SET NULL',
        },
        title: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        description: {
            type: 'TEXT',
        },
        job_type: {
            type: 'VARCHAR(50)',
        },
        experience_level: {
            type: 'VARCHAR(50)',
        },
        location_type: {
            type: 'VARCHAR(50)',
        },
        location_city: {
            type: 'VARCHAR(100)',
        },
        salary_min: {
            type: 'BIGINT',
        },
        salary_max: {
            type: 'BIGINT',
        },
        is_salary_visible: {
            type: 'BOOLEAN',
            default: true,
        },
        status: {
            type: 'VARCHAR(20)',
            default: 'open',
        },
        created_at: {
            type: 'TIMESTAMP',
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
        updated_at: {
            type: 'TIMESTAMP',
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('jobs');
};
