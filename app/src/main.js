import './styles.css';
import { initAuth } from './auth.js';

// Auth runs first — blocks until user has an active session.
// The module writes the email to localStorage so the inline getUser()
// in index.html can read it immediately after.
initAuth();
