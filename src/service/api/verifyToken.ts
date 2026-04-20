import axiosClient from '@/lib/axios';

export const verifyToken = async (token: string) => {
  try {
    const response = await axiosClient.post('/api/v1/user/login', {
      idToken: token,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
