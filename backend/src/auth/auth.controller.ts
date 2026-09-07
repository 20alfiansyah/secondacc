import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, LoginResult } from './auth.service';

class LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
  ): Promise<{ success: boolean; token: string; user: LoginResult['user'] }> {
    const result = await this.authService.login(body.username, body.password);
    return { success: true, token: result.token, user: result.user };
  }
}
