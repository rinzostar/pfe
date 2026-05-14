const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startLive: (data) => ipcRenderer.invoke('api:start-live', data),
  endLive: (data) => ipcRenderer.invoke('api:end-live', data),
  getLivekitToken: (data) => ipcRenderer.invoke('api:livekit-token', data),
  createUser: (data) => ipcRenderer.invoke('api:create-user', data),
  createPost: (data) => ipcRenderer.invoke('api:create-post', data),
  reportPost: (data) => ipcRenderer.invoke('api:report-post', data),
  deletePost: (data) => ipcRenderer.invoke('api:delete-post', data),
  dismissReports: (data) => ipcRenderer.invoke('api:dismiss-reports', data),
  uploadFile: (data) => ipcRenderer.invoke('api:upload-file', data),
  generateCourse: (data) => ipcRenderer.invoke('api:ai-course', data),
  chatCourse: (data) => ipcRenderer.invoke('api:ai-course-chat', data),
});
