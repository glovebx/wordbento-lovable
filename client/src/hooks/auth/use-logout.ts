import { useNavigate } from 'react-router-dom';
// Assuming the path to your useAuth hook is correct and it exports AuthContextType
import useAuth from './use-auth';
// Assuming the path to your axiosPrivate instance is correct and it's typed as AxiosInstance
import { axiosPrivate } from "@/lib/axios";
import axios from 'axios'; // Import Axios and AxiosError for type checking in catch block

/**
 * Custom hook to handle user logout.
 * It sends a logout request to the backend, clears authentication state,
 * and redirects the user to the login page.
 *
 * @returns A function to trigger the logout process.
 */
const useLogout = () => {
    // Access the setAuth function from the authentication context provided by useAuth
    // useAuth hook is expected to return an object including setAuth
    const { logout: _logout } = useAuth();

    // Get the navigate function from react-router-dom
    const navigate = useNavigate();

    /**
     * Performs the asynchronous logout operation.
     * Sends a request to the backend logout endpoint and updates client-side state on success.
     * @returns A Promise that resolves when the logout process is complete.
     */
    const logout = async (): Promise<void> => {
        try {
            // Send a POST request to the /api/auth/logout endpoint using the axiosPrivate instance.
            // axiosPrivate is configured to include credentials (cookies) needed for session management.
            // TypeScript infers the response type based on the axiosPrivate instance.
            const response = await axiosPrivate.post('/api/auth/logout');

            // Check if the server response status is not 200 (OK).
            // If not OK, throw an error to be caught by the catch block.
            if (response.status !== 200) {
                throw new Error(`Logout failed with status: ${response.status}`);
            }

            // Optional: Client-side cookie clearing.
            // The server-side logout endpoint should invalidate the session and potentially clear the cookie.
            // This client-side step can be a safeguard but might not be strictly necessary
            // if the backend handles cookie invalidation correctly.
            // If using 'js-cookie' or similar:
            // import Cookies from 'js-cookie';
            // Cookies.remove('session_id', { path: '/' }); // Adjust path and domain if necessary

            // Reset the authentication state in the context to null.
            // This updates the UI to reflect the logged-out state.
            // setAuth(null);
            _logout();

            // Redirect the user to the login page using react-router-dom's navigate function.
            navigate('/');

        } catch (err: any) { // Catch any errors that occur during the try block. Type as 'any' initially.
            // Check if the error is an AxiosError for more specific handling.
            if (axios.isAxiosError(err)) {
                // Log specific Axios error details
                console.error('Logout failed (Axios Error):', err.message);
                if (err.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error('Status:', err.response.status);
                    console.error('Data:', err.response.data);
                    console.error('Headers:', err.response.headers);
                } else if (err.request) {
                    // The request was made but no response was received
                    console.error('No response received:', err.request);
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('Error setting up request:', err.message);
                }
            } else {
                 // Handle other types of errors
                 console.error('Logout failed (General Error):', err);
            }
            // Optional: Display an error message to the user using a toast or other UI element.
            // Example (requires a toast context/hook):
            // toast({
            //     title: "Logout Failed",
            //     description: "Could not log out. Please try again.",
            //     variant: "destructive",
            // });
        }
    };

    // Return the logout function so components can call it to initiate the logout flow.
    return logout;
};

export default useLogout;
