/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('applications', {
        id: {
            type: 'VARCHAR(36)',
            primaryKey: true,
        },
        user_id: {
            type: 'VARCHAR(36)',
            notNull: true,
            references: '"users"(id)',
            onDelete: 'CASCADE',
        },
        job_id: {
            type: 'VARCHAR(36)',
            notNull: true,
            references: '"jobs"(id)',
            onDelete: 'CASCADE',
        },
        status: {
            type: 'VARCHAR(50)',
            default: 'pending',
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
    pgm.createConstraint('applications', 'unique_user_job', { unique: ['user_id', 'job_id'] });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropTable('applications');
};
