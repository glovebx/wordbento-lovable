import { useEffect } from 'react';

const INVITATION_CODE_STORAGE_KEY = 'invitationCode'; // Key for storing in localStorage

const AppInitializer = () => { // Or integrate this logic directly into your App component

  useEffect(() => {
    // Get the current URL
    const url = new URL(window.location.href);

    // --- Modified: Get the string directly after the '?' ---
    // The 'search' property includes the leading '?'
    const searchString = url.search; // e.g., "?8999" or "?invite=CODE" or ""

    let invitationCodeFromUrl = null;

    // Check if the search string exists and is not just "?"
    if (searchString && searchString.length > 1 && searchString.startsWith('?')) {
        // Extract the string after the '?'
        const potentialCode = searchString.substring(1); // e.g., "8999" or "invite=CODE"

        // Basic check: Assume if it doesn't contain '=', it's the direct invitation code
        // This is a simple heuristic. You might need a more robust check
        // based on your invitation code format (e.g., regex for length/characters).
        if (!potentialCode.includes('=')) {
             invitationCodeFromUrl = potentialCode;
             console.log(`Potential invitation code found directly after ?: ${invitationCodeFromUrl}`);
        } else {
             console.log(`Search string looks like a parameter: ${searchString}. Not treating as direct invitation code.`);
             // Optional: If you still want to support ?invite=CODE, you would add that logic here
             // const inviteParam = url.searchParams.get('invite');
             // if (inviteParam) {
             //     invitationCodeFromUrl = inviteParam;
             //     console.log(`Invitation code found in 'invite' parameter: ${invitationCodeFromUrl}`);
             // }
        }
    } else {
        console.log("No search string or only '?' found in URL.");
    }
    // --- End Modification ---


    if (invitationCodeFromUrl) {
      // If an invitation code is found in the URL
      console.log(`Invitation code found in URL: ${invitationCodeFromUrl}`);

      // Optional: Validate the code format if needed before storing
      // e.g., if your codes are always 6 uppercase letters/numbers
      // Example basic validation (assuming 4-6 digits/letters)
      // const codeRegex = /^[A-Z0-9]{4,6}$/;
      // if (!codeRegex.test(invitationCodeFromUrl)) {
      //      console.warn(`URL code "${invitationCodeFromUrl}" does not match expected format.`);
      //      invitationCodeFromUrl = null; // Ignore if format is wrong
      // }


      if (invitationCodeFromUrl) { // Check again after optional validation
          // Store the invitation code in localStorage
          // This will overwrite any previously stored code from a different URL
          localStorage.setItem(INVITATION_CODE_STORAGE_KEY, invitationCodeFromUrl);
          console.log(`Stored invitation code "${invitationCodeFromUrl}" in localStorage.`);

          // Optional: Clean the URL to remove the search string
          // This prevents the code from being re-processed on subsequent page loads or refreshes
          // It also makes the URL cleaner for the user.
          // Use replaceState to change the URL without reloading the page
          // Set the search part to an empty string
          url.search = '';
          window.history.replaceState({}, document.title, url.toString());
          console.log("Removed search string from URL.");
      }


    } else {
      // If no invitation code is found in the URL, check if one is already stored
      const storedInvitationCode = localStorage.getItem(INVITATION_CODE_STORAGE_KEY);
      if (storedInvitationCode) {
        console.log(`No invitation code in URL, but found one in localStorage: ${storedInvitationCode}`);
        // You might want to keep it, or clear it after a certain time, or clear it on successful registration.
        // For this flow, we keep it until registration.
      } else {
        console.log("No invitation code found in URL or localStorage.");
      }
    }

    // No cleanup needed for this effect as it runs once on mount

  }, []); // Empty dependency array ensures this effect runs only once on mount

  // This component doesn't render anything, it just performs side effects.
  // You would wrap your main App content with this or integrate the logic directly.
  return null; // Or return children if used as a wrapper
};

export default AppInitializer;