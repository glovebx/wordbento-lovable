import { useContext } from 'react';
// Assuming AuthContext and its value type (AuthContextType) are exported from AuthProvider
import { AuthContext, AuthContextType } from '@/contexts/AuthContext';

/**
 * Custom hook to access the authentication context.
 * Throws an error if used outside of an AuthProvider.
 *
 * @returns The authentication context value.
 * @throws Error if the hook is used outside of an AuthProvider.
 */
const useAuth = (): AuthContextType => {
    // Use useContext with the expected context type
    const context: AuthContextType | undefined = useContext(AuthContext);

    // Check if the context is null (meaning it's not used within the provider)
    if (!context) {
        console.error("useAuth must be used within an AuthProvider");
        // Throw an error to indicate incorrect usage
        throw new Error("useAuth must be used within an AuthProvider");
    }

    // If context is not null, return it. TypeScript now knows it's AuthContextType.
    return context;
};

export default useAuth;
