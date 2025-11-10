import { Controller, Get } from '@nestjs/common';

@Controller()
export class HomeController {
  @Get()
  getHome() {
    return {
      message: 'Bienvenido a la API de Ortopedia CEMYDI',
      version: '1.0.0',
      endpoints: {
        auth: {
          register: 'POST /auth/register',
          login: 'POST /auth/login',
        },
        users: {
          getAll: 'GET /users',
          getOne: 'GET /users/:id',
          create: 'POST /users',
          update: 'PATCH /users/:id',
          delete: 'DELETE /users/:id',
        },
      },
    };
  }
}
