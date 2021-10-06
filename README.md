<p align="center">
  <img src="https://raw.githubusercontent.com/chec/commercejs-examples/master/assets/logo.svg" width="500" height="100" />
</p>
<p align="center">
  <a href="https://circleci.com/gh/chec/cli/tree/master" rel="nofollow"><img alt="CircleCI" src="https://circleci.com/gh/chec/cli/tree/master.svg?style=shield"></a>
  <a href="https://github.com/chec/cli/blob/master/LICENSE.md"><img alt="License" src="https://img.shields.io/github/license/chec/cli.svg"></a>
  <a href="https://npmjs.org/package/@chec/cli" rel="nofollow"><img alt="Version" src="https://img.shields.io/npm/v/@chec/cli.svg"></a>
  <a href="https://npmjs.org/package/@chec/cli" rel="nofollow"><img alt="Downloads/week" src="https://img.shields.io/npm/dw/@chec/cli.svg"></a>
</p>

# Chec CLI
<!-- toc -->
* [Chec CLI](#chec-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @chec/cli
$ chec COMMAND
running command...
$ chec (-v|--version|version)
@chec/cli/1.3.0 darwin-x64 node-v12.20.0
$ chec --help [COMMAND]
USAGE
  $ chec COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`chec demo-store [STORE] [TARGETDIRECTORY]`](#chec-demo-store-store-targetdirectory)
* [`chec help [COMMAND]`](#chec-help-command)
* [`chec log LOGID`](#chec-log-logid)
* [`chec login`](#chec-login)
* [`chec logout`](#chec-logout)
* [`chec logs`](#chec-logs)
* [`chec register`](#chec-register)
* [`chec request METHOD RESOURCE [PAYLOAD]`](#chec-request-method-resource-payload)
* [`chec whoami`](#chec-whoami)

## `chec demo-store [STORE] [TARGETDIRECTORY]`

Create a demo store using Chec and Commerce.js

```
USAGE
  $ chec demo-store [STORE] [TARGETDIRECTORY]

ARGUMENTS
  STORE            The store that you want your example based off of
  TARGETDIRECTORY  The destination directory name to download the example to. The defaults to the store name

OPTIONS
  --env=env   Extra env variables to set for a .env file in the installed project

  --no-login  Optionally skip the login requirement. This is likely to be incompatible with example stores that are
              available for download

  --no-seed   Optionally skip seeding sample data into your Chec account

DESCRIPTION
  This command will download an example project from GitHub and initialise it on your machine. You will be free to edit 
  the downloaded code and play around with Commerce.js in client code
```

_See code: [src/commands/demo-store.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/demo-store.js)_

## `chec help [COMMAND]`

display help for chec

```
USAGE
  $ chec help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.1/src/commands/help.ts)_

## `chec log LOGID`

Get full detail about a given log ID

```
USAGE
  $ chec log LOGID

ARGUMENTS
  LOGID  The log ID for the log entry you want to retrieve

OPTIONS
  --raw  Display a "raw" unformatted JSON blob of the log details
  --utc  Display timestamps in UTC timezone instead of the local timezone

DESCRIPTION
  Communicates with Chec to get full log information for the given log ID
```

_See code: [src/commands/log.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/log.js)_

## `chec login`

Log into your Chec account

```
USAGE
  $ chec login

OPTIONS
  -e, --email=email        Your accounts email address
  -p, --password=password  The password to login with
  --skip-check             Indicate that this command should skip checking if a user is already logged in

DESCRIPTION
  Log into your Chec account to enable commands that require API access.
```

_See code: [src/commands/login.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/login.js)_

## `chec logout`

Log out of your account

```
USAGE
  $ chec logout

DESCRIPTION
  Log out of your account and remove the local copy of your API keys.
```

_See code: [src/commands/logout.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/logout.js)_

## `chec logs`

Show a summary of your API requests processed by Chec.

```
USAGE
  $ chec logs

OPTIONS
  -f, --[no-]follow      "Follow" logs from Chec. New events that happen are shown live
  -h, --history=history  [default: 100] Keep record of the given number of logs when browsing back.
  -n, --tail=tail        Show the last n number of logs before listening for new logs
  --utc                  Display timestamps in UTC timezone

DESCRIPTION
  Listens for logs from Chec and displays a summary of them to you as they are processed by Chec.
  You may optionally retrieve prior logs and navigate through shown logs to fetch further details about the log entry 
  from Chec.
```

_See code: [src/commands/logs.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/logs.js)_

## `chec register`

Register an account with Chec

```
USAGE
  $ chec register

DESCRIPTION
  Sign up for a Chec account through your browser
```

_See code: [src/commands/register.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/register.js)_

## `chec request METHOD RESOURCE [PAYLOAD]`

Run abstract API request

```
USAGE
  $ chec request METHOD RESOURCE [PAYLOAD]

ARGUMENTS
  METHOD    (GET|POST|PUT|PATCH|DELETE) HTTP method
  RESOURCE  API resource (e.g. /v1/products)
  PAYLOAD   Request payload (JSON encoded)

OPTIONS
  --file=file  Optional: path to JSON encoded file containing request payload
  --sandbox    Use sandbox API keys

DESCRIPTION
  Runs an arbitrary API request given the HTTP method, endpoint, and input payload.

  Data should be provided as a JSON object. You may also use `--sandbox` to use
  sandbox API keys.

EXAMPLES
  $ chec request GET /v1/products
  $ chec request GET /v1/orders
  $ chec request GET /v1/products '{"limit":1}'
  $ chec request GET /v1/products '{"limit":1}' --sandbox
  $ chec request POST /v1/assets --file=my-asset-payload.json
```

_See code: [src/commands/request.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/request.js)_

## `chec whoami`

Get information on your user account

```
USAGE
  $ chec whoami

DESCRIPTION
  Fetches information on your user account, and merchants associated with your account.

EXAMPLE
  $ chec whoami
```

_See code: [src/commands/whoami.js](https://github.com/chec/cli/blob/v1.3.0/src/commands/whoami.js)_
<!-- commandsstop -->
