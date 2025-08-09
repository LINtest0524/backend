import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Menu, MenuDeviceType, MenuStatus } from './menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { User, UserRole } from '../user/user.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private menuRepository: Repository<Menu>,
  ) {}

  // 建立選單
  async create(createMenuDto: CreateMenuDto, user: User): Promise<Menu> {
    // 權限檢查
    this.checkPermission(user, createMenuDto.company_id);

    // 檢查父選單是否存在且不超過3級
    if (createMenuDto.parent_id) {
      const parent = await this.menuRepository.findOne({
        where: { id: createMenuDto.parent_id },
        relations: ['parent'],
      });

      if (!parent) {
        throw new NotFoundException('父選單不存在');
      }

      // 檢查是否超過3級
      if (parent.parent?.parent_id) {
        throw new BadRequestException('選單最多只能有3級');
      }

      // 檢查父選單是否屬於同一公司
      if (parent.company_id !== createMenuDto.company_id) {
        throw new BadRequestException('父選單必須屬於同一公司');
      }
    }

    const menu = this.menuRepository.create({
      ...createMenuDto,
      created_by: user.id,
    });

    return await this.menuRepository.save(menu);
  }

  // 取得公司的選單樹狀結構
  async findByCompany(companyId: number, deviceType?: MenuDeviceType): Promise<Menu[]> {
    const queryBuilder = this.menuRepository
      .createQueryBuilder('menu')
      .leftJoinAndSelect('menu.children', 'children')
      .leftJoinAndSelect('children.children', 'grandchildren')
      .where('menu.company_id = :companyId', { companyId })
      .andWhere('menu.parent_id IS NULL')
      .andWhere('menu.status = :status', { status: MenuStatus.ACTIVE })
      .orderBy('menu.sort_order', 'ASC')
      .addOrderBy('children.sort_order', 'ASC')
      .addOrderBy('grandchildren.sort_order', 'ASC');

    // 只有明確指定 deviceType 時才過濾，否則返回所有選單
    if (deviceType && deviceType !== MenuDeviceType.BOTH) {
      queryBuilder.andWhere(
        '(menu.device_type = :deviceType OR menu.device_type = :both)',
        { deviceType, both: MenuDeviceType.BOTH }
      );
    }

    return await queryBuilder.getMany();
  }

  // 取得所有選單（管理用）
  async findAllByCompany(companyId: number, user: User): Promise<Menu[]> {
    this.checkPermission(user, companyId);

    return await this.menuRepository.find({
      where: { company_id: companyId },
      relations: ['parent', 'created_by_user'],
      order: { sort_order: 'ASC' },
    });
  }

  // 取得單一選單
  async findOne(id: number, user: User): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id },
      relations: ['company', 'parent', 'children', 'created_by_user'],
    });

    if (!menu) {
      throw new NotFoundException('選單不存在');
    }

    this.checkPermission(user, menu.company_id);
    return menu;
  }

  // 更新選單
  async update(id: number, updateMenuDto: UpdateMenuDto, user: User): Promise<Menu> {
    const menu = await this.findOne(id, user);

    // 如果要更改父選單，需要檢查層級
    if (updateMenuDto.parent_id !== undefined && updateMenuDto.parent_id !== menu.parent_id) {
      if (updateMenuDto.parent_id) {
        const parent = await this.menuRepository.findOne({
          where: { id: updateMenuDto.parent_id },
          relations: ['parent'],
        });

        if (!parent) {
          throw new NotFoundException('父選單不存在');
        }

        // 檢查是否會造成循環引用
        if (await this.wouldCreateCircularReference(id, updateMenuDto.parent_id)) {
          throw new BadRequestException('不能將選單設為自己的子選單');
        }

        // 檢查層級
        if (parent.parent?.parent_id) {
          throw new BadRequestException('選單最多只能有3級');
        }
      }
    }

    Object.assign(menu, updateMenuDto);
    return await this.menuRepository.save(menu);
  }

  // 刪除選單
  async remove(id: number, user: User): Promise<void> {
    const menu = await this.findOne(id, user);

    // 檢查是否有子選單
    const childrenCount = await this.menuRepository.count({
      where: { parent_id: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException('請先刪除所有子選單');
    }

    await this.menuRepository.remove(menu);
  }

  // 批量更新排序
  async updateSortOrder(updates: { id: number; sort_order: number }[], user: User): Promise<void> {
    for (const update of updates) {
      const menu = await this.findOne(update.id, user);
      menu.sort_order = update.sort_order;
      await this.menuRepository.save(menu);
    }
  }

  // 權限檢查
  private checkPermission(user: User, companyId: number): void {
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.GLOBAL_ADMIN) {
      return; // 超級管理員和全域管理員可以管理所有公司
    }

    if (user.role === UserRole.AGENT_OWNER) {
      // 代理商老闆只能管理自己的公司
      if (!user.company || user.company.id !== companyId) {
        throw new ForbiddenException('沒有權限管理此公司的選單');
      }
      return;
    }

    // 客服和一般用戶都沒有權限管理選單
    throw new ForbiddenException('沒有權限管理選單');
  }

  // 檢查是否會造成循環引用
  private async wouldCreateCircularReference(menuId: number, parentId: number): Promise<boolean> {
    let currentParentId: number | null = parentId;
    
    while (currentParentId) {
      if (currentParentId === menuId) {
        return true;
      }
      
      const parent = await this.menuRepository.findOne({
        where: { id: currentParentId },
        select: ['parent_id'],
      });
      
      currentParentId = parent?.parent_id || null;
    }
    
    return false;
  }
}