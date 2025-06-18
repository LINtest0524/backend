import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyModule } from '../company-module/company-module.entity';

@Controller('portal/auth')
export class PortalAuthController {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    @InjectRepository(CompanyModule)
    private readonly moduleRepo: Repository<CompanyModule>,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto, @Req() req: any) {
    const existing = await this.userService.findOneByUsername(body.username);
    if (existing) {
      throw new ConflictException('帳號已存在');
    }

    const user = await this.userService.createFromPortal(body);
    const fullUser = await this.userService.findById(user.id);

    const payload = {
      userId: fullUser.id,
      username: fullUser.username,
      companyId: fullUser.company?.id ?? null,
    };

    const token = this.jwtService.sign(payload);

    return {
      message: '註冊成功',
      token,
      user: {
        id: fullUser.id,
        username: fullUser.username,
        email: fullUser.email,
      },
    };
  }

 @Post('login')
async login(@Body() body: { username: string; password: string }, @Req() req: any) {
  const { username, password } = body;

  const user = await this.userService.validatePortalUser(username, password);
  if (!user) {
    throw new UnauthorizedException('帳號或密碼錯誤');
  }

  // ✅ 從查詢參數中取出 company（你要在前端也一併傳過來）
  const companyCode = req.query.company;

  if (companyCode && user.company?.code !== companyCode) {
  console.warn(
    `🚫 公司代碼錯誤：帳號 ${user.username} 所屬 ${user.company?.code}，嘗試從 ${companyCode} 登入`
  );
  // 改成模糊訊息，避免洩露資訊
  throw new UnauthorizedException('帳號或密碼錯誤');
}


  const token = this.jwtService.sign({
    userId: user.id,
    username: user.username,
    companyId: user.company?.id ?? null,
  });

  const enabledModules = await this.moduleRepo.find({
    where: { company: { id: user.company.id }, enabled: true },
  });

  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      company: {
        id: user.company.id,
        code: user.company.code,
      },
      enabledModules: enabledModules.map((m) => m.module_key),
    },
  };
}



}
