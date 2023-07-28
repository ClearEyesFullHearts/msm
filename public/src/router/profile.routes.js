import {
  Layout, Profile, Contacts, Vault,
} from '@/views/profile';

export default {
  path: '/profile',
  component: Layout,
  children: [
    { path: '', component: Profile },
    { path: 'contacts', component: Contacts },
    { path: 'vault', component: Vault },
  ],
};
