const { verifyAndReplaceArtifactToml } = require('/home/runner/workspace/.local/skills/artifacts/bootstrap.js');
async function run() {
  const result = await verifyAndReplaceArtifactToml({
    tempFilePath: '/home/runner/workspace/artifacts/qr-course-demo/.replit-artifact/artifact.edit.toml',
    artifactTomlPath: '/home/runner/workspace/artifacts/qr-course-demo/.replit-artifact/artifact.toml'
  });
  console.log(result);
}
run();
