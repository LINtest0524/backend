import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoTagRule, ConditionType } from './auto-tag-rule.entity';
import { User } from '../user/user.entity';
import { UserTag } from '../user/user-tag.entity';

@Injectable()
export class AutoTagRuleService {
  constructor(
    @InjectRepository(AutoTagRule)
    private readonly autoTagRuleRepository: Repository<AutoTagRule>,
    @InjectRepository(UserTag)
    private readonly userTagRepository: Repository<UserTag>,
  ) {}

  /**
   * 檢查並應用自動化標籤規則
   * @param user 使用者實體
   * @param changedFields 變更的欄位 (可選，用於優化性能)
   */
  async applyAutoTags(user: User, changedFields?: string[]): Promise<void> {
    console.log(`🔍 開始檢查自動標籤 - 使用者: ${user.username}, 公司ID: ${user.company_id}`);
    
    // 獲取該公司的所有啟用的自動化規則
    const rules = await this.autoTagRuleRepository.find({
      where: { 
        is_active: true,
        company_id: user.company_id 
      },
      relations: ['tag']
    });

    console.log(`📋 找到 ${rules.length} 個自動標籤規則`);

    for (const rule of rules) {
      console.log(`🔎 檢查規則: ${rule.trigger_field} = ${rule.trigger_value} → 標籤 ${rule.tag_id}`);
      
      // 如果指定了變更欄位，只檢查相關規則
      if (changedFields && !changedFields.includes(rule.trigger_field)) {
        console.log(`⏭️ 跳過規則 ${rule.id}，欄位 ${rule.trigger_field} 不在變更列表中`);
        continue;
      }

      const shouldHaveTag = this.evaluateCondition(user, rule);
      const hasTag = await this.userHasTag(user.id, rule.tag_id);

      console.log(`📊 規則評估結果: 應該有標籤=${shouldHaveTag}, 目前有標籤=${hasTag}`);

      if (shouldHaveTag && !hasTag) {
        // 應該有標籤但沒有 → 添加標籤
        console.log(`➕ 準備添加標籤 ${rule.tag_id} 給使用者 ${user.username}`);
        await this.addAutoTag(user.id, rule.tag_id);
        console.log(`自動添加標籤: ${rule.tag?.name || '未知標籤'} 給使用者 ${user.username}`);
      } else if (!shouldHaveTag && hasTag) {
        // 不應該有標籤但有 → 移除標籤
        console.log(`➖ 準備移除標籤 ${rule.tag_id} 從使用者 ${user.username}`);
        await this.removeAutoTag(user.id, rule.tag_id);
        console.log(`自動移除標籤: ${rule.tag?.name || '未知標籤'} 從使用者 ${user.username}`);
      } else {
        console.log(`✅ 標籤狀態正確，無需變更`);
      }
    }
    
    console.log(`🏁 自動標籤檢查完成 - 使用者: ${user.username}`);
  }

  /**
   * 評估條件是否滿足
   */
  private evaluateCondition(user: User, rule: AutoTagRule): boolean {
    const fieldValue = user[rule.trigger_field];
    const triggerValue = rule.trigger_value;

    switch (rule.condition_type) {
      case ConditionType.EQUALS:
        // 處理布林值
        if (triggerValue === 'true') return fieldValue === true;
        if (triggerValue === 'false') return fieldValue === false;
        // 處理其他值
        return String(fieldValue) === triggerValue;

      case ConditionType.GREATER_THAN:
        const numValue = Number(fieldValue);
        const numTrigger = Number(triggerValue);
        return !isNaN(numValue) && !isNaN(numTrigger) && numValue > numTrigger;

      case ConditionType.LESS_THAN:
        const numValue2 = Number(fieldValue);
        const numTrigger2 = Number(triggerValue);
        return !isNaN(numValue2) && !isNaN(numTrigger2) && numValue2 < numTrigger2;

      case ConditionType.NOT_NULL:
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

      case ConditionType.IS_NULL:
        return fieldValue === null || fieldValue === undefined || fieldValue === '';

      default:
        return false;
    }
  }

  /**
   * 檢查使用者是否已有該標籤
   */
  private async userHasTag(userId: number, tagId: number): Promise<boolean> {
    try {
      const count = await this.userTagRepository.count({
        where: { 
          user: { id: userId }, 
          tag: { id: tagId } 
        }
      });
      console.log(`檢查標籤: 使用者 ${userId}, 標籤 ${tagId}, 數量: ${count}`);
      return count > 0;
    } catch (error) {
      console.error(`❌ 檢查標籤失敗: 使用者 ${userId}, 標籤 ${tagId}`, error);
      return false;
    }
  }

  /**
   * 添加自動標籤
   */
  private async addAutoTag(userId: number, tagId: number): Promise<void> {
    try {
      const userTag = this.userTagRepository.create({
        user: { id: userId },
        tag: { id: tagId }
      });
      await this.userTagRepository.save(userTag);
      console.log(`✅ 成功添加標籤 ${tagId} 給使用者 ${userId}`);
    } catch (error) {
      console.error(`❌ 添加標籤失敗: 使用者 ${userId}, 標籤 ${tagId}`, error);
      throw error;
    }
  }

  /**
   * 移除自動標籤
   */
  private async removeAutoTag(userId: number, tagId: number): Promise<void> {
    await this.userTagRepository.delete({
      user: { id: userId },
      tag: { id: tagId }
    });
  }

  /**
   * 獲取所有自動化規則
   */
  async findAll(companyId?: number): Promise<AutoTagRule[]> {
    const where = companyId ? { company_id: companyId } : {};
    return this.autoTagRuleRepository.find({
      where,
      relations: ['tag', 'company'],
      order: { created_at: 'DESC' }
    });
  }

  /**
   * 創建新的自動化規則
   */
  async create(ruleData: Partial<AutoTagRule>): Promise<AutoTagRule> {
    const rule = this.autoTagRuleRepository.create(ruleData);
    return this.autoTagRuleRepository.save(rule);
  }

  /**
   * 更新自動化規則
   */
  async update(id: number, ruleData: Partial<AutoTagRule>): Promise<AutoTagRule> {
    await this.autoTagRuleRepository.update(id, ruleData);
    const rule = await this.autoTagRuleRepository.findOne({ 
      where: { id }, 
      relations: ['tag', 'company'] 
    });
    
    if (!rule) {
      throw new Error(`自動化規則 ID ${id} 不存在`);
    }
    
    return rule;
  }

  /**
   * 刪除自動化規則
   */
  async delete(id: number): Promise<void> {
    await this.autoTagRuleRepository.delete(id);
  }
}