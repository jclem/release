const core = require('@actions/core')
const exec = require('@actions/exec')

const releases = [
  'major',
  'minor',
  'patch',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease'
]

main().catch(core.setFailed)

async function main() {
  const releaseBranch = getInput('branch', 'release')

  await install()
  await build()
  await checkout(releaseBranch)
  await commit()
  await push(releaseBranch)
}

async function checkout(releaseBranch) {
  await group('Checking out release branch', async () => {
    await exec.exec('git', ['fetch', 'origin', releaseBranch])
    await exec.exec('git', ['checkout', releaseBranch])
  })
}

async function install() {
  await group('Installing npm dependencies', async () => {
    await exec.exec('npm', ['install'])
  })
}

async function build() {
  await group('Starting build', async () => {
    await exec.exec('npm', ['run', '--if-present', 'build'])
    await exec.exec('git', ['add', '--all'])
    await exec.exec('git', ['stash'])
  })
}

async function commit() {
  await group('Commiting changes', async () => {
    await exec.exec('git', ['checkout', 'stash', '--', '.'])

    const newVersion = getInput('version', null, {required: true})
    const preID = getInput('pre-id', null)

    if (!releases.includes(newVersion)) {
      throw new Error(
        `Version "${newVersion} must be one of ${JSON.stringify(releases)}`
      )
    }

    if (preID && newVersion !== 'prerelease') {
      throw new Error('Provided pre-id with non-prerelease version')
    }

    await exec.exec('git', ['add', '--all'])
    const npmVsnArgs = preID ? [newVersion, `--preid=${preID}`] : [newVersion]
    await exec.exec('npm', ['version', ...npmVsnArgs])
    await exec.exec('git', ['tag', '-f', 'latest'])
  })
}

async function push(releaseBranch) {
  await group('Pushing changes', async () => {
    await exec.exec('git', ['push', '--follow-tags', 'origin', releaseBranch])
  })
}

async function group(name, fn) {
  try {
    core.startGroup(name)
    return await fn()
  } finally {
    core.endGroup()
  }
}

function getInput(key, defaultValue = null, opts = {}) {
  const value = core.getInput(key, opts) || defaultValue
  core.debug(`got value "${value}" for input "${key}"`)
  return value
}
