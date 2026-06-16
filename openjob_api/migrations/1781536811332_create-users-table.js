/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.createTable('users', {
        id: {
            type: 'VARCHAR(36)',
            primaryKey: true,
        },
        name: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        email: {
            type: 'VARCHAR(255)',
            notNull: true,
            unique: true,
        },
        password: {
            type: 'VARCHAR(255)',
            notNull: true,
        },
        role: {
            type: 'VARCHAR(50)',
            default: 'user',
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
    pgm.dropTable('users');
};
