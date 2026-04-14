export async function up (queryInterface, Sequelize) {
  await queryInterface.addColumn('Products', 'colorableParts', {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  })
  await queryInterface.addColumn('Products', 'colorExclusions', {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  })
  await queryInterface.addColumn('Products', 'colorChangeable', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  })
}

export async function down (queryInterface) {
  await queryInterface.removeColumn('Products', 'colorChangeable')
  await queryInterface.removeColumn('Products', 'colorExclusions')
  await queryInterface.removeColumn('Products', 'colorableParts')
}
