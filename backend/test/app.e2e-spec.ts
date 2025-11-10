import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;

  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Aplicar las mismas configuraciones que en main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    
    // Obtener PrismaService después de inicializar la app
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    try {
      if (prismaService) {
        await prismaService.user.deleteMany({
          where: {
            email: {
              in: [testUser.email, 'existing@example.com'],
            },
          },
        });
        await prismaService.$disconnect();
      }
    } catch (error) {
      // Ignorar errores de limpieza
    }

    if (app) {
      await app.close();
    }
  });

  describe('Home Endpoint', () => {
    it('GET / should return welcome message', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('endpoints');
        });
    });
  });

  describe('Auth Endpoints', () => {
    describe('POST /auth/register', () => {
      it('should register a new user successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send(testUser)
          .expect(201);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.user).not.toHaveProperty('password');
        expect(response.body.access_token).toBeTruthy();

        // Guardar token para pruebas posteriores
        authToken = response.body.access_token;
      });

      it('should reject registration with duplicate email', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send(testUser)
          .expect(409)
          .expect((res) => {
            expect(res.body.message).toContain('El email ya está registrado');
          });
      });

      it('should reject registration with invalid data', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            name: 'A', // Muy corto
            email: 'invalid-email', // Email inválido
            password: '123', // Muy corto
          })
          .expect(400);
      });
    });

    describe('POST /auth/login', () => {
      it('should login successfully with correct credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
          .expect(200);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.access_token).toBeTruthy();
      });

      it('should reject login with incorrect password', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: 'wrongpassword',
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toContain('Credenciales inválidas');
          });
      });

      it('should reject login with non-existent email', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'password123',
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toContain('Credenciales inválidas');
          });
      });

      it('should reject login with invalid data', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'invalid-email',
            password: '',
          })
          .expect(400);
      });
    });
  });

  describe('Users Endpoints', () => {
    beforeAll(async () => {
      // Asegurar que tenemos un token válido
      if (!authToken) {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          });
        authToken = loginResponse.body.access_token;
      }
    });

    describe('GET /users', () => {
      it('should deny access without token', async () => {
        await request(app.getHttpServer())
          .get('/users')
          .expect(401);
      });

      it('should allow access with valid token', async () => {
        const response = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /users/:id', () => {
      let userId: string;

      beforeAll(async () => {
        // Obtener el ID del usuario de prueba
        const usersResponse = await request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${authToken}`);
        
        if (usersResponse.body.length > 0) {
          userId = usersResponse.body.find(
            (u: any) => u.email === testUser.email,
          )?.id;
        }
      });

      it('should deny access without token', async () => {
        await request(app.getHttpServer())
          .get('/users/123')
          .expect(401);
      });

      it('should return user with valid token', async () => {
        if (userId) {
          const response = await request(app.getHttpServer())
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
          expect(response.body).not.toHaveProperty('password');
        }
      });

      it('should return 404 for non-existent user', async () => {
        await request(app.getHttpServer())
          .get('/users/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe('POST /users', () => {
      it('should deny access without token', async () => {
        await request(app.getHttpServer())
          .post('/users')
          .send({
            name: 'New User',
            email: 'newuser@example.com',
            password: 'password123',
          })
          .expect(401);
      });

      it('should create user with valid token', async () => {
        const newUser = {
          name: 'New User',
          email: `newuser${Date.now()}@example.com`,
          password: 'password123',
        };

        const response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${authToken}`)
          .send(newUser)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(newUser.email);
        expect(response.body).not.toHaveProperty('password');
      });
    });
  });
});
