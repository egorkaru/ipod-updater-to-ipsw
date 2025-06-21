const path = require('node:path');
const fs = require('node:fs');

const plist = require('plist');
const AdmZip = require("adm-zip");

function createManifestContent({
  firmwareName,
  buildID,
  VisibleBuildID,
  iPodFamily,
  updaterFamily,
  identicalToUpdaterFamily,
  defaultColor,
  displayInAbout,
  aboutBoxOrdering,
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>FirmwarePayload</key>
    <dict>
	<key>FirmwareName</key>
	<string>${firmwareName}</string>
	<key>BuildID</key>
	<integer>${buildID}</integer>
	<key>VisibleBuildID</key>
	<integer>${VisibleBuildID}</integer>
	<key>FamilyID</key>
	<integer>${iPodFamily}</integer>
	<key>UpdaterFamilyID</key>
	<integer>${updaterFamily}</integer>
	<key>DefaultColor</key>
	<string>${defaultColor}</string>
	<key>DisplayInAbout</key>
	${displayInAbout ? '<true/>' : '<false/>'}${typeof aboutBoxOrdering === 'number' ? `
	<key>aboutBoxOrdering</key>
	<integer>${aboutBoxOrdering}</integer>` : ''}${typeof identicalToUpdaterFamily === 'number' ? `
		<key>identicalToUpdaterFamily</key>
		<integer>${identicalToUpdaterFamily}</integer>` : ''}
    </dict>
</dict>
</plist>

`;
};

function createIPSWFile (firmwareFiles, updaterManifest, outputDirectoryPath) {
  const firmware = firmwareFiles.find(({ updaterFamilyId }) => (
    updaterFamilyId === updaterManifest.updaterFamily ||
    updaterFamilyId === updaterManifest.identicalToUpdaterFamily
  ));

  const manifestFileContent = createManifestContent({
    firmwareName: firmware.firmwareName,
    ...updaterManifest,
  })

  const zip = new AdmZip();

  zip.addFile("manifest.plist", Buffer.from(manifestFileContent, "utf8"));
  zip.addLocalFile(firmware.path);

  const firmwareFileName = `iPod_${updaterManifest['updaterFamily']}.${firmware.version}.ipsw`;

  zip.writeZip(path.resolve(outputDirectoryPath, `./${firmwareFileName}`));

  console.log(
    'Created:',
    `${outputDirectoryPath}${firmwareFileName}`,
    updaterManifest.identicalToUpdaterFamily
      ? `(via ${firmware.firmwareName})`
      : '',
    );
}

function parseIpodUpdaterFiles(inputPath, outputPath) {
  const normalizedInputPath = inputPath.endsWith('/')
    ? inputPath
    : `${inputPath}/`;

  const normalizedOutputPath = outputPath.endsWith('/')
    ? outputPath
    : `${outputPath}/`;

  const updatesFolderPath = path.resolve(normalizedInputPath, './Contents/Resources/Updates/');
  const updaterVersionsPlistPath = path.join(normalizedInputPath, './Contents/Resources/UpdaterVersions.plist');

  const firmwareFiles = fs.readdirSync(updatesFolderPath)
    .filter((filename) => filename.startsWith('Firmware-'))
    .map((filename) => {
      const [updaterFamilyId, ...etcVersion] = filename.split('-')[1].split('.');
      return {
        firmwareName: filename,
        path: path.resolve(updatesFolderPath, `./${filename}`),
        updaterFamilyId: Number(updaterFamilyId),
        version: etcVersion.join('.'),
      };
    });

  const updaterFamilyIds = firmwareFiles.map(({ updaterFamilyId }) => updaterFamilyId);

  const parsedUpdaterVersions =  plist.parse(fs.readFileSync(updaterVersionsPlistPath, 'utf8'));

  const possibleToCreateVersions = Object.values(parsedUpdaterVersions['Versions'])
    .filter(({ updaterFamily, identicalToUpdaterFamily }) => (updaterFamilyIds.includes(updaterFamily) || updaterFamilyIds.includes(identicalToUpdaterFamily)))

  possibleToCreateVersions.forEach((data) => {
    createIPSWFile(firmwareFiles, data, normalizedOutputPath);
  });

}

module.exports = {
  createManifestContent,
  createIPSWFile,
  parseIpodUpdaterFiles,
}
