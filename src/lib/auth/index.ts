import { goto } from '$app/navigation';

export const signOut = async () => {
  try {
    const response = await fetch('/auth/logout', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      goto('/auth/login');
    } else {
      throw Error('Sign out failed');
    }
  } catch (err) {
    console.error('Error during sign-out: ', err);
  }
};
