import * as fs from "fs";
import * as path from "path";

const CONTRACT_NAME = "VehicleCondition";
const rel = "../backend";
const outdir = path.resolve("./abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir);
}

const dir = path.resolve(rel);
const dirname = path.basename(dir);
const line = "\n===================================================================\n";

if (!fs.existsSync(dir)) {
  console.error(
    `${line}Unable to locate ${rel}. Expecting <root>/VehicleCondition/${dirname}${line}`
  );
  process.exit(1);
}

const deploymentsDir = path.join(dir, "deployments");

function readDeployment(chainName, chainId, contractName) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);
  if (!fs.existsSync(chainDeploymentDir)) {
    console.log(
      `Skipping ${chainName} (chainId: ${chainId}): deployment directory not found at '${chainDeploymentDir}'`
    );
    return undefined;
  }
  
  const deploymentFile = path.join(chainDeploymentDir, `${contractName}.json`);
  if (!fs.existsSync(deploymentFile)) {
    console.log(
      `Skipping ${chainName} (chainId: ${chainId}): deployment file not found at '${deploymentFile}'`
    );
    return undefined;
  }
  
  try {
    const jsonString = fs.readFileSync(deploymentFile, "utf-8");
    const obj = JSON.parse(jsonString);
    obj.chainId = chainId;
    obj.chainName = chainName;
    console.log(`Found deployment for ${chainName} (chainId: ${chainId}) at ${obj.address}`);
    return obj;
  } catch (error) {
    console.log(
      `Skipping ${chainName} (chainId: ${chainId}): error reading deployment file - ${error.message}`
    );
    return undefined;
  }
}

// Try to read ABI from compiled artifacts if no deployment is found
function readABIFromArtifacts() {
  const artifactsPath = path.join(dir, "artifacts", "contracts", `${CONTRACT_NAME}.sol`, `${CONTRACT_NAME}.json`);
  if (!fs.existsSync(artifactsPath)) {
    return undefined;
  }
  try {
    const jsonString = fs.readFileSync(artifactsPath, "utf-8");
    const obj = JSON.parse(jsonString);
    return obj.abi;
  } catch (error) {
    console.log(`Error reading artifacts: ${error.message}`);
    return undefined;
  }
}

// Try to read deployments - automatically skip if not found
const deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME);
const deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME);

// We need at least one deployment or compiled artifacts to get the ABI
let sourceDeployment = deployLocalhost || deploySepolia;
let abi = sourceDeployment ? sourceDeployment.abi : undefined;

// If no deployment found, try to read from compiled artifacts
if (!abi) {
  console.log("No deployments found, trying to read ABI from compiled artifacts...");
  abi = readABIFromArtifacts();
  if (!abi) {
    console.error(
      `${line}No deployments found and no compiled artifacts. Please either:\n1. Deploy the contract: goto '${dirname}' directory and run 'npx hardhat deploy --network localhost' or 'npx hardhat deploy --network sepolia'\n2. Or compile the contract: goto '${dirname}' directory and run 'npx hardhat compile'${line}`
    );
    process.exit(1);
  }
  console.log("Successfully read ABI from compiled artifacts.");
}

// Verify ABI consistency if multiple deployments exist
if (deployLocalhost && deploySepolia) {
  if (JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)) {
    console.warn(
      `Warning: ABI differs between localhost and Sepolia deployments. Using ABI from ${sourceDeployment.chainName}.`
    );
  }
}

const tsCode = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify(
  { abi: abi },
  null,
  2
)} as const;
\n`;

// Build addresses object only for existing deployments
const addressesEntries = [];
if (deployLocalhost) {
  addressesEntries.push(
    `  "31337": { address: "${deployLocalhost.address}", chainId: 31337, chainName: "hardhat" }`
  );
}
if (deploySepolia) {
  addressesEntries.push(
    `  "11155111": { address: "${deploySepolia.address}", chainId: 11155111, chainName: "sepolia" }`
  );
}

// If no deployments found, create empty addresses object
const tsAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const ${CONTRACT_NAME}Addresses = { 
${addressesEntries.length > 0 ? addressesEntries.join(",\n") : ""}
};
`;

fs.writeFileSync(path.join(outdir, `${CONTRACT_NAME}ABI.ts`), tsCode, "utf-8");
fs.writeFileSync(
  path.join(outdir, `${CONTRACT_NAME}Addresses.ts`),
  tsAddresses,
  "utf-8"
);

console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}ABI.ts`)}`);
console.log(`Generated ${path.join(outdir, `${CONTRACT_NAME}Addresses.ts`)}`);


