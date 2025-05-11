import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";

// API Base URL from .env configuration
// import.meta.env is typically typed by your build tool (like Vite)
const baseURL: string | undefined = import.meta.env.VITE_APP_API_BASE_URL;

if (!baseURL) {
  // Log an error if the base URL is missing
  console.error("API Base URL is not set. Check your .env file.");
  // Depending on your application's needs, you might want to throw an error here
  // or handle this case gracefully to prevent subsequent API calls from failing.
} else {
  // Log the base URL for debugging only if it's set
  console.log("API Base URL:", baseURL);
}


// Standard Axios instance for general API requests
// Type the instance as AxiosInstance
const axiosInstance: AxiosInstance = axios.create({ baseURL });

// Private Axios instance with session management
// Type the instance as AxiosInstance
export const axiosPrivate: AxiosInstance = axios.create({
  baseURL, // Use the same base URL
  headers: { "Content-Type": "application/json" }, // Default headers for JSON requests
  withCredentials: true, // Ensures cookies are sent with requests for authentication
});

// Response interceptor to handle errors for the private Axios instance
// Type the error parameter as AxiosError
axiosPrivate.interceptors.response.use(
  (response) => response, // Return the response as is if there are no errors
  async (error: AxiosError) => {
    // Access the original request config from the error
    // Type assertion might be needed depending on Axios version and setup,
    // but AxiosError typically includes a 'config' property of type AxiosRequestConfig
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized error (e.g., expired or invalid session)
    // Check if the response status is 401 and if the request hasn't been retried yet
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true; // Mark the request as retried to avoid infinite loops

      console.error("Unauthorized access, performing logout."); // Log the unauthorized error

      // Clear localStorage to remove any stored user data
      localStorage.clear();

      // Optionally, clear session cookies
      // Ensure domain and path are correct for your application
      // SameSite=None requires Secure=true, which is appropriate for cross-site requests over HTTPS
      document.cookie = "session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.toopost.us; secure; SameSite=None";

      // Redirect the user to the login page
      // Using window.location.href will cause a full page reload
      window.location.href = "/";

      // Reject the promise immediately after initiating logout/redirect
      return Promise.reject(error);
    }

    // Reject the promise with the error for further handling by the calling code
    return Promise.reject(error);
  }
);

// Export the standard instance as default
export default axiosInstance;
