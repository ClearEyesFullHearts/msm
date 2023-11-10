import {
  Layout, Create, Connect, Login, Register,
} from '@/views/account';

export default {
  path: '/',
  component: Layout,
  children: [
    { path: 'login', component: Login },
    { path: 'create', component: Create },
    { path: 'connect', component: Connect },
    { path: 'register', component: Register },
  ],
};
