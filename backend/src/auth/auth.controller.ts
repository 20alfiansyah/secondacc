import { Body, Controller, Post } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthService, LoginResult } from './auth.service';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
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
