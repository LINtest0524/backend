import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateCommissionConditions1702000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 建立 commission_conditions 主表
    await queryRunner.createTable(
      new Table({
        name: 'commission_conditions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['SETTLEMENT_ACTIVE_MEMBERS', 'SETTLEMENT_ECPAY_PERSON'],
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'effectiveFrom',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'effectiveTo',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'company_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'agent_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // 2. 建立 condition_groups 表
    await queryRunner.createTable(
      new Table({
        name: 'condition_groups',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'commission_condition_id',
            type: 'uuid',
            isNullable: false,
          },
          // 門檻條件
          {
            name: 'minRegistrations',
            type: 'int',
            default: 0,
          },
          {
            name: 'minActiveMembers',
            type: 'int',
            default: 0,
          },
          {
            name: 'minValidBets',
            type: 'int',
            default: 0,
          },
          {
            name: 'minNetRevenue',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'requireNegativeProfit',
            type: 'boolean',
            default: false,
          },
          // 結果設定
          {
            name: 'sharePercent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'agentRemitPercent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'order',
            type: 'int',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // 3. 建立 platform_refund_rates 表
    await queryRunner.createTable(
      new Table({
        name: 'platform_refund_rates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'condition_group_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'platformCode',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'refundPercent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '0.00',
          },
        ],
      }),
      true,
    );

    // 4. 建立 fixed_costs 表
    await queryRunner.createTable(
      new Table({
        name: 'fixed_costs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'condition_group_id',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'feeDeposit',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'feeWithdraw',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'refundBudgetPercent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'promoBudgetPercent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '0.00',
          },
          {
            name: 'bonusBudgetPercent',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: '0.00',
          },
        ],
      }),
      true,
    );

    // 5. 新增外鍵約束
    await queryRunner.createForeignKey(
      'commission_conditions',
      new TableForeignKey({
        columnNames: ['company_id'],
        referencedTableName: 'company',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'commission_conditions',
      new TableForeignKey({
        columnNames: ['agent_id'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'condition_groups',
      new TableForeignKey({
        columnNames: ['commission_condition_id'],
        referencedTableName: 'commission_conditions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'platform_refund_rates',
      new TableForeignKey({
        columnNames: ['condition_group_id'],
        referencedTableName: 'condition_groups',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'fixed_costs',
      new TableForeignKey({
        columnNames: ['condition_group_id'],
        referencedTableName: 'condition_groups',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 6. 新增索引
    await queryRunner.createIndex(
      'commission_conditions',
      new TableIndex({
        name: 'IDX_commission_conditions_company_id',
        columnNames: ['company_id'],
      }),
    );

    await queryRunner.createIndex(
      'commission_conditions',
      new TableIndex({
        name: 'IDX_commission_conditions_agent_id',
        columnNames: ['agent_id'],
      }),
    );

    await queryRunner.createIndex(
      'condition_groups',
      new TableIndex({
        name: 'IDX_condition_groups_commission_condition_id',
        columnNames: ['commission_condition_id'],
      }),
    );

    await queryRunner.createIndex(
      'condition_groups',
      new TableIndex({
        name: 'IDX_condition_groups_order',
        columnNames: ['order'],
      }),
    );

    await queryRunner.createIndex(
      'platform_refund_rates',
      new TableIndex({
        name: 'IDX_platform_refund_rates_condition_group_id',
        columnNames: ['condition_group_id'],
      }),
    );

    await queryRunner.createIndex(
      'fixed_costs',
      new TableIndex({
        name: 'IDX_fixed_costs_condition_group_id',
        columnNames: ['condition_group_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 刪除表格（按依賴順序）
    await queryRunner.dropTable('fixed_costs');
    await queryRunner.dropTable('platform_refund_rates');
    await queryRunner.dropTable('condition_groups');
    await queryRunner.dropTable('commission_conditions');
  }
}