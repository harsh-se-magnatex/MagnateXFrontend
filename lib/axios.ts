import axios from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

let handling401 = false;

function isAuthPath(pathname: string) {
  return (
    pathname === '/sign-in' ||
    pathname.startsWith('/sign-in/') ||
    pathname === '/sign-up' ||
    pathname.startsWith('/sign-up/')
  );
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const onAuthPage = isAuthPath(window.location.pathname);

      if (!handling401) {
        handling401 = true;
        try {
          await axios.get(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/auth/clear-session`,
            { withCredentials: true }
          );
        } catch {
          // ignore clear failures; still leave the protected area
        }

        if (!onAuthPage) {
          // replace avoids stacking history entries during a bounce
          window.location.replace('/sign-in');
        } else {
          handling401 = false;
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
