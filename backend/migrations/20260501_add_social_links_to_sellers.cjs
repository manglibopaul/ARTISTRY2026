export async function up (queryInterface, Sequelize) {
  await queryInterface.addColumn('Sellers', 'socialLinks', {
    type: Sequelize.JSON,
    allowNull: false,
    defaultValue: {},
  })
}

export async function down (queryInterface) {
  await queryInterface.removeColumn('Sellers', 'socialLinks')
}
