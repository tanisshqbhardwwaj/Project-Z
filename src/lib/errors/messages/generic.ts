import { ErrorCodes } from "../codes";

export const genericMessages: Record<string, string> = {
  [ErrorCodes.INTERNAL_ERROR]: "Something went wrong. Please try again.",
  [ErrorCodes.UNKNOWN]: "Something went wrong. Please try again.",
  [ErrorCodes.NO_FILE]: "Please choose a file to upload.",
  [ErrorCodes.INVALID_FILE]: "This file type isn't supported.",
  [ErrorCodes.FILE_TOO_LARGE]: "File is too large. Maximum size is 20 MB.",
  [ErrorCodes.CORS_FORBIDDEN]: "This request isn't allowed from this app.",
};

export const genericMessageByText: Record<string, string> = {
  "An unexpected error occurred": "Something went wrong. Please try again.",
  "Request failed": "Something went wrong. Please try again.",
  "Something went wrong. Please try again.": "Something went wrong. Please try again.",
  "File storage is not available. Try again later.":
    "File storage isn't available right now. Try again later.",
  "Please check your input and try again.": "Please check your input and try again.",
  "A record with this value already exists":
    "This already exists. Check for duplicates and try again.",
};
