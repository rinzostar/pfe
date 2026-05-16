import { convex } from './convexClient';
import { api } from '../../convex/_generated/api';

const ok = (data) => ({ data, error: null });
const err = (message) => ({ data: null, error: { message } });

function normalize(data) {
  if (Array.isArray(data)) return data.map(normalize);
  if (data && typeof data === 'object' && !(data instanceof Date)) {
    const result = {};
    for (const key in data) {
      if (key === '_id') {
        result.id = data[key];
        result._id = data[key];
      } else if (key === '_creationTime') {
        result._creationTime = data[key];
      } else {
        result[key] = normalize(data[key]);
      }
    }
    return result;
  }
  return data;
}

export async function listFaculties() {
  try {
    const result = await convex.query(api.faculties.list, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listDepartments(facultyId) {
  try {
    if (!facultyId) return ok([]);
    const result = await convex.query(api.departments.listByFaculty, { facultyId });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listLevels() {
  try {
    const result = await convex.query(api.programs.list, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listYears(levelId) {
  try {
    if (!levelId) return ok([]);
    const result = await convex.query(api.years.listByProgram, { programId: levelId });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listSemesters(yearId) {
  try {
    if (!yearId) return ok([]);
    const result = await convex.query(api.semesters.listByYear, { yearId });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listModulesBySemester(semesterId) {
  try {
    if (!semesterId) return ok([]);
    const result = await convex.query(api.modules.listBySemester, { semesterId: String(semesterId) });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listModulesByDepartment(departmentId) {
  try {
    if (!departmentId) return ok([]);
    const result = await convex.query(api.modules.listByDepartment, { departmentId: String(departmentId) });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function getModule(id) {
  try {
    if (!id) return ok(null);
    const result = await convex.query(api.modules.get, { id: String(id) });
    return ok(normalize(result));
  } catch (e) { return ok(null); }
}

export async function listCoursesByModule(moduleId) {
  try {
    if (!moduleId) return ok([]);
    const result = await convex.query(api.courses.listByModule, { moduleId: String(moduleId) });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listAttachments({ moduleId, courseId } = {}) {
  try {
    if (courseId) {
      const result = await convex.query(api.attachments.listByCourse, { courseId: String(courseId) });
      return ok(normalize(result || []));
    }
    if (moduleId) {
      const result = await convex.query(api.attachments.listByModule, { moduleId: String(moduleId) });
      return ok(normalize(result || []));
    }
    return ok([]);
  } catch (e) { return ok([]); }
}

export async function getCourse(id) {
  try {
    if (!id) return ok(null);
    const result = await convex.query(api.courses.get, { id: String(id) });
    return ok(normalize(result));
  } catch (e) { return ok(null); }
}

export async function listFavorites() {
  try {
    const result = await convex.query(api.favorites.listMine, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function toggleFavorite(_, courseId) {
  try {
    await convex.mutation(api.favorites.toggle, { courseId: String(courseId) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function endLivestream(id) {
  try {
    await convex.mutation(api.livestreams.end, { livestreamId: id ? String(id) : undefined });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function deletePost(id) {
  try {
    await convex.mutation(api.posts.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function dismissReports(postId) {
  try {
    await convex.mutation(api.posts.dismissReports, { postId: String(postId) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function listMyModules() {
  try {
    const result = await convex.query(api.modules.listMyModules, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function createCourse({ module_id, title, content = '', yt_url = null }) {
  try {
    const result = await convex.mutation(api.courses.create, {
      moduleId: String(module_id),
      title,
      content,
      ytUrl: yt_url,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateCourse(id, { title, content, yt_url }) {
  try {
    await convex.mutation(api.courses.update, {
      id: String(id),
      title,
      content,
      ytUrl: yt_url,
    });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function deleteCourse(id) {
  try {
    await convex.mutation(api.courses.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function deleteAttachment(id) {
  try {
    await convex.mutation(api.attachments.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function createAttachment({ course_id, file, file_name, file_type = 'pdf' }) {
  try {
    const uploadUrl = await convex.mutation(api.attachments.generateUploadUrl, {});
    const response = await fetch(uploadUrl, { method: "POST", body: file });
    const { storageId } = await response.json();
    const result = await convex.mutation(api.attachments.create, {
      courseId: String(course_id),
      storageId,
      fileName: file_name,
      fileType: file_type,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function listPosts({ departmentId, yearId } = {}) {
  try {
    const result = await convex.query(api.posts.list, {
      departmentId: departmentId ? String(departmentId) : undefined,
      yearId: yearId ? String(yearId) : undefined,
    });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function createPost({ author_id, content, link = null, file_path = null, department_id = null, year_id = null }) {
  try {
    const result = await convex.mutation(api.posts.create, {
      content,
      link,
      filePath: file_path,
      departmentId: department_id ? String(department_id) : undefined,
      yearId: year_id ? String(year_id) : undefined,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function togglePostLike(_, postId) {
  try {
    await convex.mutation(api.posts.toggleLike, { postId: String(postId) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function togglePostFavorite(_, postId) {
  try {
    await convex.mutation(api.posts.toggleFavorite, { postId: String(postId) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function addComment({ post_id, content }) {
  try {
    const result = await convex.mutation(api.posts.addComment, {
      postId: String(post_id),
      content,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function reportPost(postId) {
  try {
    await convex.mutation(api.posts.report, { postId: String(postId) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function listReports() {
  try {
    const result = await convex.query(api.posts.listReports, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function listUsers() {
  try {
    const result = await convex.query(api.users.listUsers, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function setBanned(userId, banned) {
  try {
    await convex.mutation(api.users.setBanned, { userId: String(userId), banned });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function listAdminModules() {
  try {
    const result = await convex.query(api.modules.listMyModules, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function createModule({ name, semester_id, department_id, owner_id }) {
  try {
    const result = await convex.mutation(api.modules.create, {
      name,
      semesterId: String(semester_id),
      departmentId: department_id ? String(department_id) : undefined,
      ownerId: owner_id ? String(owner_id) : undefined,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateModule(id, { name }) {
  try {
    await convex.mutation(api.modules.update, { id: String(id), name });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function listProfessors() {
  try {
    const result = await convex.query(api.users.listProfessors, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function getActiveLivestreamForModule(moduleId) {
  try {
    const result = await convex.query(api.livestreams.getActiveForModule, { moduleId: String(moduleId) });
    return ok(normalize(result));
  } catch (e) { return ok(null); }
}

export async function listActiveLivestreams() {
  try {
    const result = await convex.query(api.livestreams.listActive, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function createLivestream({ moduleId, moduleName, roomName }) {
  try {
    const result = await convex.mutation(api.livestreams.create, {
      moduleId: String(moduleId),
      moduleName,
      roomName,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function listChat(livestreamId) {
  try {
    const result = await convex.query(api.chat.list, { livestreamId: String(livestreamId) });
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function sendChat(livestreamId, _, __, message) {
  try {
    await convex.mutation(api.chat.send, { livestreamId: String(livestreamId), message });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function listNotifications() {
  try {
    const result = await convex.query(api.notifications.list, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function markNotificationRead(id) {
  try {
    await convex.mutation(api.notifications.markRead, { id: String(id) });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function markAllNotificationsRead() {
  try {
    await convex.mutation(api.notifications.markAllRead, {});
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function getUnreadCount() {
  try {
    const result = await convex.query(api.notifications.unreadCount, {});
    return ok(result || 0);
  } catch (e) { return ok(0); }
}

export async function createAccessRequest({ module_id, module_name }) {
  try {
    const result = await convex.mutation(api.accessRequests.create, {
      moduleId: String(module_id),
      moduleName: module_name,
    });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function listAccessRequests() {
  try {
    const result = await convex.query(api.accessRequests.list, {});
    return ok(normalize(result || []));
  } catch (e) { return ok([]); }
}

export async function approveAccessRequest(id) {
  try {
    await convex.mutation(api.accessRequests.updateStatus, { id: String(id), status: "approved" });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function rejectAccessRequest(id) {
  try {
    await convex.mutation(api.accessRequests.updateStatus, { id: String(id), status: "rejected" });
    return ok(true);
  } catch (e) { return ok(true); }
}

export async function seedAll() {
  return ok({ message: 'Seed not implemented in migration' });
}

export async function getRecentActivity() {
  return ok([]);
}

export async function getContinueLearning() {
  return ok([]);
}

export async function getUpcomingEvents() {
  return ok([]);
}

export async function createUser({ email, password, fullName, role }) {
  try {
    const result = await convex.action(api.users.createUser, { email, password, name: fullName, role });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function createFaculty({ name, icon, color }) {
  try {
    const result = await convex.mutation(api.faculties.create, { name, icon, color });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateFaculty(id, { name, icon, color }) {
  try {
    await convex.mutation(api.faculties.update, { id: String(id), name, icon, color });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function deleteFaculty(id) {
  try {
    await convex.mutation(api.faculties.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function createDepartment({ name, facultyId, icon }) {
  try {
    const result = await convex.mutation(api.departments.create, { name, facultyId: String(facultyId), icon });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateDepartment(id, { name, icon }) {
  try {
    await convex.mutation(api.departments.update, { id: String(id), name, icon });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function deleteDepartment(id) {
  try {
    await convex.mutation(api.departments.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function createLevel({ name, code, icon }) {
  try {
    const result = await convex.mutation(api.programs.create, { name, code, icon });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateLevel(id, { name, code, icon }) {
  try {
    await convex.mutation(api.programs.update, { id: String(id), name, code, icon });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function deleteLevel(id) {
  try {
    await convex.mutation(api.programs.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function createYear({ levelId, code, name }) {
  try {
    const result = await convex.mutation(api.years.create, { programId: String(levelId), code, name });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateYear(id, { code, name }) {
  try {
    await convex.mutation(api.years.update, { id: String(id), code, name });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function deleteYear(id) {
  try {
    await convex.mutation(api.years.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function createSemester({ yearId, code, label }) {
  try {
    const result = await convex.mutation(api.semesters.create, { yearId: String(yearId), code, label });
    return ok(normalize(result));
  } catch (e) { return err(e.message); }
}

export async function updateSemester(id, { code, label }) {
  try {
    await convex.mutation(api.semesters.update, { id: String(id), code, label });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function deleteSemester(id) {
  try {
    await convex.mutation(api.semesters.remove, { id: String(id) });
    return ok(true);
  } catch (e) { return err(e.message); }
}

export async function getProfile() {
  try {
    const result = await convex.query(api.users.getMe, {});
    return ok(normalize(result));
  } catch (e) { return ok(null); }
}

// AI wrappers
export async function generateCourse(body) {
  try {
    const result = await convex.action(api.ai.generateCourse, body);
    return ok(result);
  } catch (e) { return err(e.message); }
}

export async function chatCourse(body) {
  try {
    const result = await convex.action(api.ai.chatCourse, body);
    return ok(result);
  } catch (e) { return err(e.message); }
}
