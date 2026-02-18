const { execSync } = require("child_process");

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Error: No command provided");
  process.exit(1);
}

const command = args[0]; // First argument is the command (e.g., 'deploy', 'synth', 'diff')
const commandArgs = args.slice(1); // Rest are the arguments for that command

// Look for --profile in the arguments
const profileIndex = commandArgs.findIndex((arg) => arg === "--profile");

if (profileIndex !== -1 && profileIndex + 1 < commandArgs.length) {
  process.env.AWS_PROFILE = commandArgs[profileIndex + 1];
}

const cmdString = `npx cdk ${command} ${commandArgs.join(" ")}`;
console.log(cmdString);
console.log(" ");

try {
  execSync(cmdString, {
    stdio: "inherit",
    env: process.env,
  });
} catch (error) {
  process.exit(error.status || 1);
}
