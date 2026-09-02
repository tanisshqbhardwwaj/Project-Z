import { ErrorCodes } from "../codes";

export const authMessages: Record<string, string> = {
  [ErrorCodes.UNAUTHORIZED]: "Please sign in to continue.",
  [ErrorCodes.INVALID_CREDENTIALS]: "Email or password is incorrect. Please try again.",
  [ErrorCodes.EMAIL_NOT_VERIFIED]:
    "Please verify your email before signing in. Check your inbox for the verification link.",
  [ErrorCodes.EMAIL_EXISTS]:
    "This email is already registered. Try signing in or use Forgot password.",
  [ErrorCodes.EMAIL_SEND_FAILED]:
    "We couldn't send the verification email. Please try again in a few minutes.",
  [ErrorCodes.ALREADY_VERIFIED]: "Your email is already verified. You can sign in.",
  [ErrorCodes.INVALID_TOKEN]: "This link has expired or is invalid. Request a new one.",
  [ErrorCodes.INVALID_REFRESH]: "Your session expired. Please sign in again.",
  [ErrorCodes.SESSION_STALE]:
    "Your session is out of date. Please refresh the page or sign in again.",
  [ErrorCodes.NO_PASSWORD]:
    "This account doesn't use a password yet. Set one in Profile if you want email login.",
  [ErrorCodes.INVALID_PASSWORD]: "Your current password is incorrect.",
  [ErrorCodes.RATE_LIMITED]: "Too many attempts. Please wait a minute and try again.",
};
