// Barrel module kept for backward compatibility. The API surface is now split
// by domain into dedicated modules; re-export them so existing imports such as
// `import { songbooksAPI } from '../services/api'` keep working.
import api from './http';

export { authAPI } from './authApi';
export { songsAPI } from './songsApi';
export { songbooksAPI } from './songbooksApi';
export { locationAPI, healthCheck } from './locationApi';

export default api;
