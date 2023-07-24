import {
  Layout, Profile, Contacts,
} from '@/views/profile';

export default {
  path: '/profile',
  component: Layout,
  children: [
    { path: '', component: Profile },
    { path: 'contacts', component: Contacts },
  ],
};
