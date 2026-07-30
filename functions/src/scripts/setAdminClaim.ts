import {applicationDefault, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";

interface AdminClaimOptions {
  uid?: string;
  email?: string;
  isAdmin: boolean;
}

/**
 * Read the value following a named command-line option.
 * @param {string[]} args Command-line arguments.
 * @param {number} index Current argument index.
 * @param {string} option Option name.
 * @return {string} The option value.
 */
function getArgumentValue(
  args: string[],
  index: number,
  option: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${option}.`);
  }
  return value;
}

/**
 * Parse the explicit admin claim value.
 * @param {string} value The raw flag value.
 * @return {boolean} Whether admin access should be enabled.
 */
function parseAdminFlag(value: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("--admin must be either true or false.");
}

/**
 * Parse and validate the claim-management command arguments.
 * @param {string[]} args Command-line arguments.
 * @return {AdminClaimOptions} Parsed claim options.
 */
function parseOptions(args: string[]): AdminClaimOptions {
  let uid: string | undefined;
  let email: string | undefined;
  let isAdmin: boolean | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--uid") {
      uid = getArgumentValue(args, index, argument);
      index += 1;
    } else if (argument === "--email") {
      email = getArgumentValue(args, index, argument);
      index += 1;
    } else if (argument === "--admin") {
      isAdmin = parseAdminFlag(getArgumentValue(args, index, argument));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if ((uid === undefined) === (email === undefined)) {
    throw new Error("Provide exactly one of --uid or --email.");
  }
  if (isAdmin === undefined) {
    throw new Error("Provide --admin true or --admin false.");
  }

  return {uid, email, isAdmin};
}

/**
 * Grant or revoke the admin custom claim for one Firebase Auth user.
 * @return {Promise<void>} Resolves after the claim is updated.
 */
async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  initializeApp({credential: applicationDefault()});

  const auth = getAuth();
  const user = options.uid ?
    await auth.getUser(options.uid) :
    await auth.getUserByEmail(options.email as string);
  const customClaims = {...(user.customClaims ?? {})};

  if (options.isAdmin) {
    customClaims.admin = true;
  } else {
    delete customClaims.admin;
  }

  await auth.setCustomUserClaims(user.uid, customClaims);
  const action = options.isAdmin ? "Granted" : "Revoked";
  console.log(`${action} admin access for ${user.uid}.`);
  console.log("The user must sign out and back in to refresh the ID token.");
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
