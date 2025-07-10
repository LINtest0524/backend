import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { LoanProduct } from './loan-product.entity';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { UpdateLoanProductDto } from './dto/update-loan-product.dto';
import { User } from '../user/user.entity';
import { AuditLogService } from '../audit-log/audit-log.service';





@Injectable()
export class LoanProductService {
  constructor(
    @InjectRepository(LoanProduct)
    private readonly loanProductRepo: Repository<LoanProduct>,

    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateLoanProductDto, user: User, ip: string, platform: string): Promise<LoanProduct> {
  // 先建立一筆基礎資料
  const newItem = this.loanProductRepo.create({
    ...dto,
    created_by: user,
    company: { id: dto.company_id },
  });

  // 儲存一次，取得 ID 後用來生成 product_code
  const saved = await this.loanProductRepo.save(newItem);

  // 根據格式產生產品編號，例如：PO20240709001
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // 例如 20250709
  const productCode = `PO${dateStr}${saved.id.toString().padStart(3, "0")}`;

  // 更新產品編號
  saved.product_code = productCode;
  await this.loanProductRepo.save(saved);

  // 寫入操作紀錄
  await this.auditLogService.create({
    action: 'CREATE',
    target: 'LoanProduct',
    targetId: saved.id,
    user,
    ip,
    platform,
    snapshot: saved,
  });

  return saved;
}










 async findAll(user: any, query: any) {
    const where: any = {};
    where.deleted_at = null;

    if (user.role !== 'SUPER_ADMIN' && user.role !== 'GLOBAL_ADMIN') {
        where.company = { id: user.companyId };
    } else if (query.company_id) {
        where.company = { id: query.company_id };
    }

    if (query.keyword) {
        where.product_name = ILike(`%${query.keyword}%`);
    }

    return this.loanProductRepo.find({
        where,
        order: { created_at: 'DESC' },
        relations: ['company'],
    });
 }







  async findAllActive(user: any) {
    return this.loanProductRepo.find({
        where: {
        company: { id: user.companyId },
        status: 'ACTIVE',
        deleted_at: null,
        } as any,
    });
    }

    async findOneSecured(id: number, user: any) {
    const record = await this.loanProductRepo.findOne({
        where: { id, deleted_at: null } as any,
        relations: ['company'],
    });

    if (!record) throw new NotFoundException('找不到資料');

    const isOwner = user.companyId === record.company?.id;
    const isAdmin = ['SUPER_ADMIN', 'GLOBAL_ADMIN'].includes(user.role);
    if (!isOwner && !isAdmin) throw new ForbiddenException('無權限查看此資料');

    return record;
    }


  async updateSecured(id: number, dto: Partial<UpdateLoanProductDto>, user: User, ip: string, platform: string) {
    const record = await this.findOneSecured(id, user);
    const updated = this.loanProductRepo.merge(record, dto);
    const saved = await this.loanProductRepo.save(updated);

    await this.auditLogService.create({
      action: 'UPDATE',
      target: 'LoanProduct',
      targetId: id,
      user,
      ip,
      platform,
      snapshot: dto,
    });

    return saved;
  }

  // 刪除
    async hardDeleteSecured(id: number, user: User, ip: string, platform: string) {
    const target = await this.loanProductRepo.findOne({ where: { id } });
    if (!target) throw new NotFoundException("找不到產品");

    await this.loanProductRepo.remove(target); // << 硬刪除！

    await this.auditLogService.create({
      action: "DELETE",
      target: "LoanProduct",
      targetId: id,
      user,
      ip,
      platform,
      snapshot: target,
    });

    return { success: true };
  }




  async cloneProduct(id: number, user: User, ip: string, platform: string): Promise<LoanProduct> {
    const original = await this.findOneSecured(id, user);
    const { id: _, created_at, updated_at, deleted_at, ...cloneData } = original;

    const cloned = this.loanProductRepo.create({
        ...cloneData,
        product_name: `${original.product_name}_複製`,
        created_by: user,
        company: { id: user.company?.id },
    });

    const saved = await this.loanProductRepo.save(cloned);

    await this.auditLogService.create({
        action: 'CLONE',
        target: 'LoanProduct',
        targetId: saved.id,
        user,
        ip,
        platform,
        snapshot: saved,
    });

    return saved;
    }


    async findByCompany(companyId: number, user: User): Promise<LoanProduct[]> {
        return this.loanProductRepo.find({
            where: {
            company: { id: companyId },
            deleted_at: null,
            } as any,
            order: { created_at: 'DESC' },
        });
        }





}
