import { Controller, Post, Body, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LoginResponseDto } from './dto/login-response.dto'
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(@Body() body: LoginDto, @Req() req: any): Promise<LoginResponseDto> {
    console.log('✅ login controller route hit')

    const { username, password, company } = body

    const clientIp =
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown'
    const platform = req.headers['user-agent'] || 'unknown'

    console.log('🧾 請求來自 IP:', clientIp)
    console.log('💻 裝置平台:', platform)
    console.log('🏢 公司名稱:', company)

    const result = await this.authService.login(
      username,
      password,
      clientIp,
      platform,
      company,
    )

    return result
  }
}
