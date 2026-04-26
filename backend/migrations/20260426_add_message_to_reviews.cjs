export async function up (queryInterface, Sequelize) {
  await queryInterface.addColumn('Reviews', 'message', {
    type: Sequelize.TEXT,
    allowNull: true,
  })
}

export async function down (queryInterface) {
  await queryInterface.removeColumn('Reviews', 'message')
}
