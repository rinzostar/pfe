// Data access layer. If Supabase env is not set, returns in-memory mock data
// so the UI still works for design preview.
import { supabase, HAS_SUPABASE } from './supabase';

// ---------- MOCK STORE ----------
const mock = {
  semesters: [
    { id: 1, level: 'Licence', year_code: 'L1', semester_code: 'S1', label: 'Licence 1 - S1' },
    { id: 2, level: 'Licence', year_code: 'L1', semester_code: 'S2', label: 'Licence 1 - S2' },
    { id: 3, level: 'Licence', year_code: 'L2', semester_code: 'S3', label: 'Licence 2 - S3' },
    { id: 4, level: 'Licence', year_code: 'L2', semester_code: 'S4', label: 'Licence 2 - S4' },
    { id: 5, level: 'Licence', year_code: 'L3', semester_code: 'S5', label: 'Licence 3 - S5' },
    { id: 6, level: 'Licence', year_code: 'L3', semester_code: 'S6', label: 'Licence 3 - S6' },
    { id: 7, level: 'Master', year_code: 'M1', semester_code: 'S1', label: 'Master 1 - S1' },
    { id: 8, level: 'Master', year_code: 'M1', semester_code: 'S2', label: 'Master 1 - S2' },
    { id: 9, level: 'Master', year_code: 'M2', semester_code: 'S3', label: 'Master 2 - S3' },
    { id: 10, level: 'Doctorat', year_code: 'D', semester_code: 'R', label: 'Doctorat - Research' },
  ],
  modules: [
    { id: 1, semester_id: 1, name: 'Mathematics I', owner_id: 'mock-professor', owner_name: 'Dr. M. Chérif' },
    { id: 2, semester_id: 1, name: 'Intro to Programming', owner_id: 'mock-professor', owner_name: 'Dr. L. Hadj' },
    { id: 3, semester_id: 1, name: 'Physics I', owner_id: 'mock-professor', owner_name: 'Dr. S. Kaci' },
    { id: 4, semester_id: 7, name: 'Linear Algebra', owner_id: 'mock-professor', owner_name: 'Dr. A. Benali' },
  ],
  courses: [
    { id: 1, module_id: 1, title: 'Vectors and spaces', content: 'Intro notes for vectors and spaces.\nhttps://www.youtube.com/watch?v=fNk_zzaMoSs', yt_url: 'https://www.youtube.com/watch?v=fNk_zzaMoSs', created_at: '2025-05-10' },
    { id: 2, module_id: 1, title: 'Matrix operations', content: 'Matrix operation notes and exercises.', yt_url: null, created_at: '2025-05-09' },
    { id: 3, module_id: 1, title: 'Linear transformations', content: 'Linear transformations overview.', yt_url: 'https://www.youtube.com/watch?v=kYB8IZa5AuE', created_at: '2025-05-07' },
  ],
  attachments: [
    { id: 1, course_id: 1, file_name: 'Lecture-01.pdf', file_path: '#' },
    { id: 2, course_id: 1, file_name: 'Exercises.docx', file_path: '#' },
    { id: 3, course_id: 2, file_name: 'Slides-week1.pptx', file_path: '#' },
  ],
  favorites: [], // {user_id, course_id}
  posts: [
    { id: 1, author_id: 'u1', author_name: 'Yacine M.', content: 'Anyone has the past exam papers for Algorithms? 📚', link: null, file_path: null, created_at: new Date(Date.now() - 7200e3).toISOString() },
    { id: 2, author_id: 'u2', author_name: 'Inès B.', content: 'Found a great free course on linear algebra.', link: 'https://youtube.com', file_path: null, created_at: new Date(Date.now() - 18000e3).toISOString() },
  ],
  reports: [],
  livestreams: [],
  users: [
    { id: 'u1', full_name: 'Aïcha Benali', email: 'a.benali@school.edu', role: 'professor', banned: false },
    { id: 'u2', full_name: 'Yacine Meziane', email: 'y.meziane@school.edu', role: 'student', banned: false },
    { id: 'u3', full_name: 'Inès Belkacem', email: 'i.belkacem@school.edu', role: 'student', banned: false },
    { id: 'u4', full_name: 'Mohamed Chérif', email: 'm.cherif@school.edu', role: 'professor', banned: false },
  ],
};

const ok = (data) => ({ data, error: null });
const nextId = (arr) => (arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1);
const electronAPI = () => (typeof window !== 'undefined' ? window.electronAPI : null);
const LIVE_TTL_HOURS = 8;
const liveCutoff = () => new Date(Date.now() - LIVE_TTL_HOURS * 60 * 60 * 1000).toISOString();

// ---------- API ----------

export async function listSemesters() {
  if (!HAS_SUPABASE) return ok(mock.semesters);
  return supabase.from('semesters').select('*').order('id');
}

export async function listModulesBySemester(semesterId) {
  if (!HAS_SUPABASE) {
    const rows = mock.modules.filter(m => m.semester_id === Number(semesterId));
    return ok(rows.map(m => ({ ...m, course_count: mock.courses.filter(c => c.module_id === m.id).length })));
  }
  const { data, error } = await supabase
    .from('modules')
    .select('id, name, semester_id, owner_id, profiles:owner_id(full_name), courses(count)')
    .eq('semester_id', semesterId);
  if (error) return { data: null, error };
  return ok(data.map(m => ({
    id: m.id, name: m.name, semester_id: m.semester_id, owner_id: m.owner_id,
    owner_name: m.profiles?.full_name, course_count: m.courses?.[0]?.count || 0,
  })));
}

export async function getModule(id) {
  if (!HAS_SUPABASE) {
    const m = mock.modules.find(x => x.id === Number(id));
    if (!m) return ok(null);
    const sem = mock.semesters.find(s => s.id === m.semester_id);
    return ok({ ...m, semester_label: sem?.label });
  }
  const { data, error } = await supabase
    .from('modules')
    .select('*, profiles:owner_id(full_name), semesters(label)')
    .eq('id', id).single();
  if (error) return { data: null, error };
  return ok({ ...data, owner_name: data.profiles?.full_name, semester_label: data.semesters?.label });
}

export async function listCoursesByModule(moduleId) {
  if (!HAS_SUPABASE) {
    const rows = mock.courses.filter(c => c.module_id === Number(moduleId));
    return ok(rows.map(c => ({ ...c, attachment_count: mock.attachments.filter(a => a.course_id === c.id).length })));
  }
  const { data, error } = await supabase
    .from('courses')
    .select('*, attachments(count)')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error };
  return ok(data.map(c => ({ ...c, attachment_count: c.attachments?.[0]?.count || 0 })));
}

export async function listAttachments({ moduleId, courseId } = {}) {
  if (!HAS_SUPABASE) {
    if (courseId) return ok(mock.attachments.filter(a => a.course_id === Number(courseId)));
    if (moduleId) {
      const courseIds = mock.courses.filter(c => c.module_id === Number(moduleId)).map(c => c.id);
      return ok(mock.attachments.filter(a => courseIds.includes(a.course_id)));
    }
    return ok([]);
  }
  if (courseId) return supabase.from('attachments').select('*').eq('course_id', courseId);
  const { data: courses } = await supabase.from('courses').select('id').eq('module_id', moduleId);
  const ids = (courses || []).map(c => c.id);
  if (!ids.length) return ok([]);
  return supabase.from('attachments').select('*').in('course_id', ids);
}

export async function endLivestream(id) {
  if (!HAS_SUPABASE) {
    const l = mock.livestreams.find(x => x.id === id);
    if (l) l.status = 'ended';
    return ok(true);
  }
  return supabase.from('livestreams').update({ status: 'ended' }).eq('id', id);
}

export async function deletePost(id) {
  if (!HAS_SUPABASE) {
    const i = mock.posts.findIndex(p => p.id === Number(id));
    if (i >= 0) mock.posts.splice(i, 1);
    mock.reports = mock.reports.filter(r => r.post_id !== Number(id));
    return ok(true);
  }
  if (electronAPI()?.deletePost) {
    const res = await electronAPI().deletePost({ id });
    if (res?.error) return { data: null, error: new Error(res.error) };
    return ok(true);
  }
  await supabase.from('reports').delete().eq('post_id', id);
  return supabase.from('posts').delete().eq('id', id);
}

export async function dismissReports(postId) {
  if (!HAS_SUPABASE) {
    mock.reports = mock.reports.filter(r => r.post_id !== Number(postId));
    return ok(true);
  }
  if (electronAPI()?.dismissReports) {
    const res = await electronAPI().dismissReports({ post_id: postId });
    if (res?.error) return { data: null, error: new Error(res.error) };
    return ok(true);
  }
  return supabase.from('reports').delete().eq('post_id', postId);
}

export async function listMyModules(profId) {
  if (!HAS_SUPABASE) {
    return ok(mock.modules
      .filter(m => m.owner_id === profId)
      .map(m => ({
        ...m,
        semester_label: mock.semesters.find(s => s.id === m.semester_id)?.label,
        course_count: mock.courses.filter(c => c.module_id === m.id).length,
      })));
  }
  const { data, error } = await supabase
    .from('modules')
    .select('*, semesters(label), courses(count)')
    .eq('owner_id', profId);
  if (error) return { data: null, error };
  return ok(data.map(m => ({
    ...m, semester_label: m.semesters?.label, course_count: m.courses?.[0]?.count || 0,
  })));
}

export async function createCourse({ module_id, title, content = '', yt_url = null }) {
  if (!HAS_SUPABASE) {
    const course = {
      id: nextId(mock.courses),
      module_id: Number(module_id),
      title,
      content,
      yt_url,
      created_at: new Date().toISOString(),
    };
    mock.courses.unshift(course);
    return ok(course);
  }
  return supabase.from('courses').insert({ module_id, title, content, yt_url }).select().single();
}

export async function updateCourse(id, { title, content, yt_url }) {
  if (!HAS_SUPABASE) {
    const c = mock.courses.find(x => x.id === Number(id));
    if (c) {
      if (title !== undefined) c.title = title;
      if (content !== undefined) c.content = content;
      if (yt_url !== undefined) c.yt_url = yt_url;
    }
    return ok(true);
  }
  return supabase.from('courses').update({ title, content, yt_url }).eq('id', id);
}

export async function deleteCourse(id) {
  if (!HAS_SUPABASE) {
    const idx = mock.courses.findIndex(x => x.id === Number(id));
    if (idx >= 0) {
      mock.courses.splice(idx, 1);
      mock.attachments = mock.attachments.filter(a => a.course_id !== Number(id));
    }
    return ok(true);
  }
  // Delete attachments first (due to FK)
  await supabase.from('attachments').delete().eq('course_id', id);
  return supabase.from('courses').delete().eq('id', id);
}

export async function deleteAttachment(id) {
  if (!HAS_SUPABASE) {
    const idx = mock.attachments.findIndex(x => x.id === Number(id));
    if (idx >= 0) mock.attachments.splice(idx, 1);
    return ok(true);
  }
  return supabase.from('attachments').delete().eq('id', id);
}

export async function createAttachment({ course_id, file_path, file_name }) {
  if (!HAS_SUPABASE) {
    const attachment = { id: nextId(mock.attachments), course_id: Number(course_id), file_path, file_name };
    mock.attachments.push(attachment);
    return ok(attachment);
  }
  return supabase.from('attachments').insert({ course_id, file_path, file_name }).select().single();
}

export async function listFavorites(userId) {
  if (!HAS_SUPABASE) {
    const favIds = mock.favorites.filter(f => f.user_id === userId).map(f => f.course_id);
    return ok(mock.courses.filter(c => favIds.includes(c.id)).map(c => ({
      ...c, module: mock.modules.find(m => m.id === c.module_id),
    })));
  }
  const { data, error } = await supabase
    .from('favorites')
    .select('courses(*, modules(name))')
    .eq('user_id', userId);
  if (error) return { data: null, error };
  return ok((data || []).map(r => ({ ...r.courses, module: { name: r.courses?.modules?.name } })));
}

export async function toggleFavorite(userId, courseId) {
  if (!HAS_SUPABASE) {
    const idx = mock.favorites.findIndex(f => f.user_id === userId && f.course_id === courseId);
    if (idx >= 0) mock.favorites.splice(idx, 1);
    else mock.favorites.push({ user_id: userId, course_id: courseId });
    return ok(true);
  }
  const { data: existing } = await supabase
    .from('favorites').select().eq('user_id', userId).eq('course_id', courseId).maybeSingle();
  if (existing) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('course_id', courseId);
  } else {
    await supabase.from('favorites').insert({ user_id: userId, course_id: courseId });
  }
  return ok(true);
}

export async function listPosts() {
  if (!HAS_SUPABASE) {
    return ok([...mock.posts].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }
  return supabase
    .from('posts')
    .select('*, profiles:author_id(full_name)')
    .order('created_at', { ascending: false });
}

export async function createPost({ author_id, content, link = null, file_path = null }) {
  if (!HAS_SUPABASE) {
    const u = mock.users.find(u => u.id === author_id) || { full_name: 'You' };
    mock.posts.unshift({ id: nextId(mock.posts), author_id, author_name: u.full_name, content, link, file_path, created_at: new Date().toISOString() });
    return ok(true);
  }
  if (electronAPI()?.createPost) {
    const res = await electronAPI().createPost({ author_id, content, link, file_path });
    if (res?.error) return { data: null, error: new Error(res.error) };
    return ok(res?.post || true);
  }
  return supabase.from('posts').insert({ author_id, content, link, file_path });
}

export async function reportPost(postId, reporterId) {
  if (!HAS_SUPABASE) {
    mock.reports.push({ id: nextId(mock.reports), post_id: postId, reporter_id: reporterId });
    return ok(true);
  }
  if (electronAPI()?.reportPost) {
    const res = await electronAPI().reportPost({ post_id: postId, reporter_id: reporterId });
    if (res?.error) return { data: null, error: new Error(res.error) };
    return ok(true);
  }
  return supabase.from('reports').insert({ post_id: postId, reporter_id: reporterId });
}

export async function listReports() {
  if (!HAS_SUPABASE) {
    const grouped = {};
    mock.reports.forEach(r => { grouped[r.post_id] = (grouped[r.post_id] || 0) + 1; });
    return ok(Object.entries(grouped).map(([pid, count]) => {
      const p = mock.posts.find(x => x.id === Number(pid));
      return p ? { ...p, count } : null;
    }).filter(Boolean));
  }
  const { data, error } = await supabase
    .from('reports')
    .select('post_id, posts(*, profiles:author_id(full_name))');
  if (error) return { data: null, error };
  const grouped = {};
  (data || []).forEach(r => {
    if (!r.posts) return;
    const k = r.post_id;
    if (!grouped[k]) grouped[k] = { ...r.posts, count: 0, author_name: r.posts.profiles?.full_name };
    grouped[k].count += 1;
  });
  return ok(Object.values(grouped));
}

export async function listUsers() {
  if (!HAS_SUPABASE) return ok(mock.users);
  return supabase.from('profiles').select('*').order('full_name');
}

export async function setBanned(userId, banned) {
  if (!HAS_SUPABASE) {
    const u = mock.users.find(x => x.id === userId);
    if (u) u.banned = banned;
    return ok(true);
  }
  return supabase.from('profiles').update({ banned }).eq('id', userId);
}

export async function listAdminModules() {
  if (!HAS_SUPABASE) {
    return ok(mock.modules.map(m => ({
      ...m,
      semester_label: mock.semesters.find(s => s.id === m.semester_id)?.label,
      owner_name: mock.users.find(u => u.id === m.owner_id)?.full_name || 'Unassigned',
    })));
  }
  return supabase
    .from('modules')
    .select('*, semesters(label), profiles:owner_id(full_name)')
    .order('id');
}

export async function createModule({ name, semester_id, owner_id }) {
  if (!HAS_SUPABASE) {
    mock.modules.push({ id: nextId(mock.modules), name, semester_id: Number(semester_id), owner_id });
    return ok(true);
  }
  return supabase.from('modules').insert({ name, semester_id, owner_id });
}

export async function updateModule(id, { name }) {
  if (!HAS_SUPABASE) {
    const m = mock.modules.find(x => x.id === Number(id));
    if (m) m.name = name;
    return ok(true);
  }
  return supabase.from('modules').update({ name }).eq('id', id);
}

export async function listProfessors() {
  if (!HAS_SUPABASE) return ok(mock.users.filter(u => u.role === 'professor'));
  return supabase.from('profiles').select('*').eq('role', 'professor');
}

export async function getActiveLivestreamForModule(moduleId) {
  if (!HAS_SUPABASE) {
    const cutoff = liveCutoff();
    return ok(mock.livestreams.find(l =>
      l.module_id === Number(moduleId) &&
      l.room_name === `module-${moduleId}` &&
      l.status === 'live' &&
      (!l.started_at || l.started_at >= cutoff)
    ) || null);
  }
  const { data } = await supabase
    .from('livestreams')
    .select('*')
    .eq('module_id', moduleId)
    .eq('room_name', `module-${moduleId}`)
    .eq('status', 'live')
    .gte('started_at', liveCutoff())
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return ok(data);
}

export async function listActiveLivestreams() {
  if (!HAS_SUPABASE) {
    const cutoff = liveCutoff();
    return ok(mock.livestreams.filter(l =>
      l.status === 'live' &&
      l.room_name === `module-${l.module_id}` &&
      (!l.started_at || l.started_at >= cutoff)
    ).map(l => ({
      ...l, module_name: mock.modules.find(m => m.id === l.module_id)?.name,
    })));
  }
  const { data, error } = await supabase
    .from('livestreams')
    .select('*, modules(name), profiles:host_id(full_name)')
    .eq('status', 'live')
    .gte('started_at', liveCutoff());
  if (error) return { data: null, error };
  return ok((data || []).filter(l => l.room_name === `module-${l.module_id}`));
}

// chat
export async function listChat(livestreamId) {
  if (!HAS_SUPABASE) return ok([]);
  return supabase
    .from('chat_messages')
    .select('*, profiles:sender_id(full_name)')
    .eq('livestream_id', livestreamId)
    .order('created_at', { ascending: true });
}

export async function sendChat(livestreamId, senderId, message) {
  if (!HAS_SUPABASE) return ok(true);
  return supabase.from('chat_messages').insert({ livestream_id: livestreamId, sender_id: senderId, message });
}
