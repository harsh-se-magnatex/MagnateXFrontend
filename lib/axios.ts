import axios from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  withCredentials: true,
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/user/auth/clear-session`, { withCredentials: true });
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
