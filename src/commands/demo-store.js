const {Command, flags} = require('@oclif/command')
const chalk = require('chalk')
const unzipper = require('unzipper')
const ora = require('ora')
const got = require('got')
const fs = require('fs')
const inquirer = require('inquirer')
const {sep} = require('path')
const spawnPromise = require('../helpers/spawn-promise')
const Auth = require('../helpers/auth')
const {makeConfig} = require('../helpers/config')
const envWriter = require('../helpers/env-writer')
const streamWriter = require('../helpers/stream-writer')

class DemoStoreCommand extends Command {
  async run() {
    this.cache = makeConfig('.checcache')
    let {args: {store}} = this.parse(DemoStoreCommand)

    // Check that the user provided a store and if it's something that's known before going and updating our cache
    if (!store || !this.getStoreFromCache(store)) {
      await this.retreiveStores()
    }

    // If the user didn't specify a store, ask them
    if (!store) {
      store = await this.askForStore()
    }

    // Get the "manifest" that defines the store
    const manifest = this.getStoreFromCache(store)

    // No manifest means that they probably gave a store name that doesn't exist
    if (!manifest) {
      this.log(`Could not find store matching "${store}". Try ${chalk.dim('chec demo-store')} for a list of options`)
      return
    }

    // Download the example and pool all the data together
    const data = {
      instructions: '',
      npm: false,
      buildScripts: [],
      ...manifest,
      ...await this.downloadExample(manifest),
    }

    // Display some sort of completion message and then run the example
    this.displayCompletion(data)
    this.runExample(data)
  }

  /**
   * Retreive all the stores that can be shown by getting the master list from the example-stores repo
   *
   * @return {Promise<Array>} A promise that resolves to the list of stores fetched freshly from GitHub
   */
  async retreiveStores() {
    if (this.stores) {
      return this.stores
    }

    const spinner = ora({
      text: 'Loading example stores...',
      stream: process.stdout,
    }).start()

    const manifest = await got('https://raw.githubusercontent.com/chec/example-stores/master/manifest.json').then(
      response => JSON.parse(response.body)
    )

    spinner.stop()

    this.cache.set({storeManifest: manifest})
    this.stores = manifest

    return this.stores
  }

  /**
   * Ask the user to specify a store from those that are available
   *
   * @return {Promise<string>} A promise that resolves to the slug for the chosen store
   */
  async askForStore() {
    // Grab the stores and _clone_ the array
    const stores = (await this.retreiveStores()).slice(0)

    // Return the only store if there's one
    if (stores.length === 1) {
      return stores.pop().slug
    }

    // Prep a closure to shorten the demo store description
    const wrapString = string => {
      const singleLine = string.replace(/[\n\r]+/g, ' ')
      if (singleLine.length > 40) {
        return `${singleLine.substring(0, 37)}...`
      }
      return singleLine
    }

    const {slug} = await inquirer.prompt([{
      type: 'list',
      name: 'slug',
      message: 'Please choose a demo store to install:',
      choices: stores.map(store => ({
        name: `${chalk.bold(store.name)} ${chalk.dim(`(${store.slug})`)}: ${wrapString(store.description || '')}`,
        value: store.slug,
      })),
    }])

    return slug
  }

  /**
   * Get the destination directory where the example project should be downloaded to. This will cause the command to
   * exit if the calculated destination direction already exists and is not empty
   *
   * @param {object} manifest The "manifest" for the store that is being downloaded
   * @return {string} The directory that the example should be downloaded to
   */
  getDestinationDirectory(manifest) {
    // Run this only once
    if (this.destinationDirectory) {
      return this.destinationDirectory
    }

    // Allow specifying a target directory before defaulting to the stores slug
    const {args: {targetDirectory}} = this.parse(DemoStoreCommand)

    this.destinationDirectory = targetDirectory && targetDirectory.startsWith(sep) ?
      targetDirectory : `${process.cwd()}${sep}${targetDirectory || manifest.slug}`

    // Check if the folder exists
    try {
      fs.accessSync(this.destinationDirectory)
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Folder doesn't exist which is fine
        return this.destinationDirectory
      }
      throw error
    }

    // Check that if the directory exists, it's empty
    if (fs.readdirSync(this.destinationDirectory).length > 0) {
      this.log(chalk.yellow(`The destination directory (${chalk.white.dim(
        this.destinationDirectory
      )}) already exists and is not empty`))
      this.exit(1)
    }

    return this.destinationDirectory
  }

  /**
   * Download the given store (defined by its manifest)
   *
   * @param {object} manifest The "manifest" for the store that is being downloaded
   * @return {Promise<object>} A promise that resolves into further config provided by the downloaded store
   */
  downloadExample(manifest) {
    // Pull just the repo name as the downloaded archive from GitHub uses this
    const [, repoName] = manifest.githubSlug.split('/', 2)
    const branch = manifest.branch || 'master'
    // We want to strip this useless directory out of our downloaded content
    const ignoreDirectory = `${repoName}-${branch}${sep}`
    // Prep the destination directory
    const destinationDirectory = this.getDestinationDirectory(manifest)

    // Form the URL for the zip bundle
    const url = `https://github.com/${manifest.githubSlug}/archive/${
      branch.replace(/[^a-z0-9._-]+/gi, '-')
    }.zip`
    this.log(`Downloading from ${chalk.dim(url)}`)

    // Start streaming the example
    const spinner = ora({
      text: 'Downloading example...',
      stream: process.stdout,
    }).start()

    // Assume the project won't define additional config
    let configResolver = Promise.resolve({})

    return new Promise((resolve, reject) => {
      const zipStream = got.stream(url).on('error', error => {
        reject(new Error(`Unexpected error occurred fetching ${chalk.dim(url)}. (${error.statusCode || error.message})`))
      })

      // Pipe the zip into an unzip parser
      return zipStream
      .pipe(unzipper.Parse()) // eslint-disable-line new-cap
      // Define custom logic when processing individual paths
      .on('entry', entry => {
        // Ignore (specficially) the useless directory or anything that's not within that directory
        if (entry.type === 'Directory' || entry.path.indexOf(ignoreDirectory) !== 0) {
          entry.autodrain()
          return
        }

        // Write the file to the destination directory minus the useless folder path
        const writer = streamWriter.create({path: `${destinationDirectory}${sep}${entry.path.substring(ignoreDirectory.length)}`})
        entry.pipe(writer)

        // If there's additional config within the root, resolve that and create a promise to resolve
        if (entry.path === `${ignoreDirectory}.chec.json`) {
          configResolver = new Promise(resolve => {
            const chunks = []

            entry.on('data', chunk => chunks.push(chunk))
            entry.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString())))
          })
        }
      })
      .on('finish', resolve)
    })
    .then(() => {
      // Stop the spinner and resolve this promise with additional config instead
      spinner.succeed(chalk.green(`Downloaded ${chalk.white(manifest.slug)} to ${chalk.white(destinationDirectory)}`))
      return configResolver
    })
    .catch(error => {
      spinner.fail(error.message)
      this.exit(1)
    })
  }

  /**
   * Display a formatted message indicating the given store has been downloaded properly
   *
   * @param {object} manifest The "manifest" for the store that is being downloaded
   */
  displayCompletion(manifest) {
    this.log(`${chalk.bold(manifest.name)}

${chalk.dim(manifest.description)}`)
  }

  /**
   * Attempt to run the example store that was downloaded by installing dependencies with NPM or Yarn and running
   * any additional configued commands
   *
   * @param {object} manifest The "manifest" for the store that is being downloaded
   * @return {Promise} Resolves when NPM installation (if applicable) is complete and further commands have finished
   */
  async runExample(manifest) {
    const {npm, buildScripts} = manifest

    try {
      await this.writeEnv(manifest)
    } catch (error) {
      return
    }

    // Don't continue if there's no NPM configuration
    if (!npm) {
      return
    }

    // Allow "yarn" to be used
    const command = npm === 'yarn' ? 'yarn' : 'npm'
    // Run the commands in the destination directory
    const cwd = this.getDestinationDirectory()
    // Prep the args that will be added to the run command
    const baseArgs = npm === 'yarn' ? ['--cwd', cwd] : ['--prefix', cwd]

    const spinner = ora({
      text: 'Installing NPM dependencies...',
      stream: process.stdout,
    }).start()

    // Spawn a subprocess for dependency installation
    await spawnPromise.spawn(command, [...baseArgs, 'install'])
    spinner.stop()

    // Loop through additional scripts and await their execution
    buildScripts.forEach(async script => {
      await spawnPromise.spawn(command, [...baseArgs, 'run', script], {stdio: 'inherit'})
    })
  }

  async writeEnv(manifest) {
    const {flags: {env}} = this.parse(DemoStoreCommand)

    let options = manifest.dotenv || {}

    if (Array.isArray(env)) {
      env.forEach(envDefinition => {
        const matches = envDefinition.match(/^([\w\d_]+)=(.+)$/i)
        if (!matches) {
          this.log(chalk.red(`Could not understand env definition: ${envDefinition}. Please provide env settings as key=value. Eg. --env key=value`))
          return
        }

        options[matches[1]] = matches[2]
      })
    }

    // Check for "dotenv" settings and update/write a .env file
    if (typeof manifest.dotenv === 'object') {
      const env = await envWriter.create(`${this.getDestinationDirectory(manifest)}${sep}.env`)

      Object.entries(manifest.dotenv).forEach(([key, value]) => {
        // Check for an injection point of chec keys
        const matches = typeof value === 'string' && value.match(/^%chec_([ps])key%$/)

        if (!matches) {
          env.set(key, value)
          return
        }

        if (!Auth.isLoggedIn()) {
          this.log(`${chalk.bgRed.white('Could not run the example store. You must be logged in')}

This store requires a .env file with your Chec.io public key provided as "${key}"`)
          throw new Error('Could not write .env')
        }
        env.set(key, Auth.getApiKey(true, matches[1] === 'p' ? 'public' : 'secret').key)
      })

      return env.writeFile()
    }
  }

  /**
   * Attempt to load a manifest from the cache for the given slug that refers to a store. A null result here might
   * indicate that the cached store list is just out of date
   *
   * @param {string} store The "slug" that refers to a store
   * @return {object|null} The cached manifest for the store or null if the cache doesn't have a manifest for the given slug
   */
  getStoreFromCache(store) {
    return (this.cache.get('storeManifest') || []).find(candidate => candidate.slug === store)
  }
}

DemoStoreCommand.args = [
  {
    name: 'store',
    description: 'The store that you want your example based off of',
  },
  {
    name: 'targetDirectory',
    description: 'The destination directory name to download the example to. The defaults to the store name',
    default: null,
  },
]

DemoStoreCommand.flags = {
  env: flags.string({
    description: 'Extra env variables to set for a .env file in the installed project',
    multiple: true,
  }),
}

DemoStoreCommand.description = `Log out of your account
Log out of your account and remove the local copy of your API keys.
`
module.exports = DemoStoreCommand
