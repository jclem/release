const core = require('@actions/core')
const exec = require('@actions/exec')

main().catch(core.setFailed)

async function main() {
  const releaseBranch = core.getInput('branch') || 'release'
  await exec.exec('git', ['checkout', releaseBranch])
  await build()
}

async function build() {
  core.startGroup('Starting build')
  core.endGroup()
}
