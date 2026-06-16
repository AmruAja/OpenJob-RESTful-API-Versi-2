/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('documents', {
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
        filename: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        original_name: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        file_path: {
            type: 'VARCHAR(500)',
            notNull: true,
        },
        mime_type: {
            type: 'VARCHAR(100)',
            notNull: true,
        },
        file_size: {
            type: 'BIGINT',
            notNull: true,
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
    pgm.dropTable('documents');
};
