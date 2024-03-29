import { Group, IGroup } from '../src/models/group';
import { Card, ICard } from '../src/models/card';
import { Tag, ITag } from '../src/models/tag';
import { IUser } from '../src/models/user';
import { connect, clearDatabase, closeDatabase } from './db';
import { Document } from 'mongoose';
import { app } from '../src/app';
import request from 'supertest';
import { Server } from 'http';

const userArgs: IUser = {
  username: 'testuser',
  password: 'testpassword',
};

const groupArgs: IGroup = {
  name: 'Test',
  description: 'This is a description for the Test group',
  owner: userArgs.username,
};

const cardArgs: Omit<ICard, 'groupId'> = {
  question: 'Why did the chicken cross the road?',
  answer: 'To get to the other side!',
};

const tagArgs: Omit<ITag, 'groupId'> = {
  name: 'Test',
  description: 'This is a description for the Test tag',
};

let card: Document;
let group: Document;
let tag: Document;
let application: Server;
let authorization: string;

beforeAll(async () => {
  application = app.listen(0);

  await connect();
});

beforeEach(async () => {
  // Login
  await request(application).post('/api/signup').send(userArgs);
  const res = await request(application).post('/api/login').send(userArgs);
  authorization = `Bearer ${res.body.token}`;

  group = Group.build(groupArgs);
  await group.save();
  card = Card.build({ ...cardArgs, groupId: group._id });
  await card.save();
  tag = Tag.build({ ...tagArgs, groupId: group._id });
  await tag.save();
});

afterEach(async () => await clearDatabase());

afterAll(async () => {
  await closeDatabase();
  await application.close();
});

describe('/api/group/:id DELETE', () => {
  it('deletes the record when given the correct ID', async () => {
    const { _id: id } = group;
    const res = await request(application).delete(`/api/group/${id}`).set('authorization', authorization);
    const { status } = res;

    expect(status).toBe(201);
  });
  it('returns the deleted record when the endpoint is called', async () => {
    const { _id: id } = group;
    const res = await request(application).delete(`/api/group/${id}`).set('authorization', authorization);
    const { body } = res;

    expect(body.name).toEqual(groupArgs.name);
    expect(body.description).toEqual(groupArgs.description);
  });
  it('throws an error if given a bad id', async () => {
    const res = await request(application).delete(`/api/group/ayy_lmao`).set('authorization', authorization);
    const { status } = res;

    expect(status).toBe(500);
  });
  it('deletes all cards associated with the group if the group is deleted', async () => {
    const { _id: id } = group;
    const res = await request(application).delete(`/api/group/${id}`).set('authorization', authorization);
    const { status } = res;

    const fetchedCards = await Card.find({ groupId: group._id }).exec();

    expect(status).toBe(201);
    expect(fetchedCards.length).toBe(0);
  });
  it('deletes all tags associated with the group if the group is deleted', async () => {
    const { _id: id } = group;
    const res = await request(application).delete(`/api/group/${id}`).set('authorization', authorization);
    const { status } = res;

    const fetchedTags = await Tag.find({ groupId: group._id }).exec();

    expect(status).toBe(201);
    expect(fetchedTags.length).toBe(0);
  });
});
