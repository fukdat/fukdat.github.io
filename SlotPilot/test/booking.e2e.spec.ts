import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/http/app.module';
import { DomainExceptionFilter } from '../src/http/domain-exception.filter';

function futureMondayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 14);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe('Booking API (e2e)', () => {
  let app: INestApplication;
  const day = futureMondayIso();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns availability', async () => {
    const res = await request(app.getHttpServer())
      .get('/availability')
      .query({ resourceId: 'res_alex', serviceId: 'svc_haircut', day })
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('books, then rejects a duplicate with 409', async () => {
    const slots = await request(app.getHttpServer())
      .get('/availability')
      .query({ resourceId: 'res_alex', serviceId: 'svc_haircut', day });
    const startsAt = slots.body[0].start as string;

    const created = await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId: 'res_alex',
        serviceId: 'svc_haircut',
        startsAt,
        customerName: 'Jane',
        customerEmail: 'jane@example.com',
      })
      .expect(201);
    expect(created.body.status).toBe('confirmed');

    await request(app.getHttpServer())
      .post('/bookings')
      .send({
        resourceId: 'res_alex',
        serviceId: 'svc_haircut',
        startsAt,
        customerName: 'Bob',
        customerEmail: 'bob@example.com',
      })
      .expect(409);
  });

  it('rejects malformed input with 400', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({ resourceId: 'res_alex', serviceId: 'svc_haircut', startsAt: 'nope' })
      .expect(400);
  });

  it('returns 404 for an unknown booking', async () => {
    await request(app.getHttpServer()).get('/bookings/does-not-exist').expect(404);
  });
});
