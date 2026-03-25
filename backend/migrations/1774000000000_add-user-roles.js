/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Create enum type for user roles
  pgm.createType("user_role", ["admin", "lender", "borrower"]);

  // Add role column to user_profiles with default 'borrower'
  pgm.addColumn("user_profiles", {
    role: {
      type: "user_role",
      notNull: true,
      default: "borrower",
    },
  });

  // Add index for faster role-based queries
  pgm.createIndex("user_profiles", "role");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropIndex("user_profiles", "role");
  pgm.dropColumn("user_profiles", "role");
  pgm.dropType("user_role");
};
