const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://dada:dada@cluster0-shard-00-00.jydfr.mongodb.net:27017/lumen?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function seed() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  console.log('Creating collections...');

  await db.createCollection('faculties');
  await db.createCollection('departments');
  await db.createCollection('levels');
  await db.createCollection('years');
  await db.createCollection('semesters');
  await db.createCollection('modules');
  await db.createCollection('courses');
  await db.createCollection('attachments');
  await db.createCollection('posts');
  await db.createCollection('reports');
  await db.createCollection('profiles');
  await db.createCollection('livestreams');
  await db.createCollection('chatMessages');
  await db.createCollection('notifications');
  await db.createCollection('accessRequests');
  await db.createCollection('favorites');

  const faculties = await db.collection('faculties');
  await faculties.insertMany([
    { name: 'Computer Science', icon: '💻', color: '#3b82f6', createdAt: new Date().toISOString() },
    { name: 'Engineering', icon: '⚙️', color: '#10b981', createdAt: new Date().toISOString() },
  ]);
  console.log('Faculties seeded');

  const departments = await db.collection('departments');
  await departments.insertMany([
    { name: 'Software Engineering', facultyId: 'Computer Science', icon: '📦', createdAt: new Date().toISOString() },
    { name: 'AI & Machine Learning', facultyId: 'Computer Science', icon: '🤖', createdAt: new Date().toISOString() },
  ]);
  console.log('Departments seeded');

  const levels = await db.collection('levels');
  await levels.insertMany([
    { name: 'Undergraduate', code: 'UG', icon: '🎓', createdAt: new Date().toISOString() },
    { name: 'Graduate', code: 'GR', icon: '📚', createdAt: new Date().toISOString() },
  ]);
  console.log('Levels seeded');

  const years = await db.collection('years');
  await years.insertMany([
    { levelId: 'Undergraduate', code: 'Year 1', name: 'First Year', createdAt: new Date().toISOString() },
    { levelId: 'Undergraduate', code: 'Year 2', name: 'Second Year', createdAt: new Date().toISOString() },
    { levelId: 'Undergraduate', code: 'Year 3', name: 'Third Year', createdAt: new Date().toISOString() },
    { levelId: 'Undergraduate', code: 'Year 4', name: 'Fourth Year', createdAt: new Date().toISOString() },
    { levelId: 'Graduate', code: 'Year 1', name: 'Masters Year 1', createdAt: new Date().toISOString() },
    { levelId: 'Graduate', code: 'Year 2', name: 'Masters Year 2', createdAt: new Date().toISOString() },
  ]);
  console.log('Years seeded');

  const semesters = await db.collection('semesters');
  await semesters.insertMany([
    { yearId: 'Year 1', code: 'S1', label: 'Semester 1', createdAt: new Date().toISOString() },
    { yearId: 'Year 1', code: 'S2', label: 'Semester 2', createdAt: new Date().toISOString() },
    { yearId: 'Year 2', code: 'S1', label: 'Semester 1', createdAt: new Date().toISOString() },
    { yearId: 'Year 2', code: 'S2', label: 'Semester 2', createdAt: new Date().toISOString() },
    { yearId: 'Year 3', code: 'S1', label: 'Semester 1', createdAt: new Date().toISOString() },
    { yearId: 'Year 3', code: 'S2', label: 'Semester 2', createdAt: new Date().toISOString() },
    { yearId: 'Year 4', code: 'S1', label: 'Semester 1', createdAt: new Date().toISOString() },
    { yearId: 'Year 4', code: 'S2', label: 'Semester 2', createdAt: new Date().toISOString() },
  ]);
  console.log('Semesters seeded');

  const modules = await db.collection('modules');
  await modules.insertMany([
    { semesterId: 'S1', departmentId: 'Software Engineering', name: 'Introduction to Programming', ownerId: 'prof1', ownerName: 'Dr. Smith', createdAt: new Date().toISOString() },
    { semesterId: 'S1', departmentId: 'Software Engineering', name: 'Data Structures', ownerId: 'prof1', ownerName: 'Dr. Smith', createdAt: new Date().toISOString() },
    { semesterId: 'S2', departmentId: 'Software Engineering', name: 'Algorithms', ownerId: 'prof2', ownerName: 'Dr. Johnson', createdAt: new Date().toISOString() },
    { semesterId: 'S1', departmentId: 'AI & Machine Learning', name: 'Neural Networks', ownerId: 'prof2', ownerName: 'Dr. Johnson', createdAt: new Date().toISOString() },
  ]);
  console.log('Modules seeded');

  const profiles = await db.collection('profiles');
  await profiles.insertMany([
    { userId: 'admin1', email: 'admin@lumen.com', fullName: 'Admin User', role: 'admin', banned: false, createdAt: new Date().toISOString() },
    { userId: 'prof1', email: 'smith@lumen.com', fullName: 'Dr. Smith', role: 'professor', banned: false, createdAt: new Date().toISOString() },
    { userId: 'prof2', email: 'johnson@lumen.com', fullName: 'Dr. Johnson', role: 'professor', banned: false, createdAt: new Date().toISOString() },
    { userId: 'student1', email: 'student@lumen.com', fullName: 'Student User', role: 'student', banned: false, createdAt: new Date().toISOString() },
  ]);
  console.log('Profiles seeded');

  console.log('Seed complete!');
  await client.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});