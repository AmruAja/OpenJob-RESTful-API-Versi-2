/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('companies', {
        id: {
            type: 'VARCHAR(36)',
            primaryKey: true,
        },
        name: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        location: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        description: {
            type: 'TEXT',
            notNull: true,
        },
        logo_url: {
            type: 'VARCHAR(500)',
        },
        website: {
            type: 'VARCHAR(255)',
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
    pgm.dropTable('companies');
};
