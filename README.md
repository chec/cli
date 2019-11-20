chec-cli
========

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/chec-cli.svg)](https://npmjs.org/package/chec-cli)
[![CircleCI](https://circleci.com/gh/chec/chec-cli/tree/master.svg?style=shield)](https://circleci.com/gh/chec/chec-cli/tree/master)
[![Codecov](https://codecov.io/gh/chec/chec-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/chec/chec-cli)
[![Downloads/week](https://img.shields.io/npm/dw/chec-cli.svg)](https://npmjs.org/package/chec-cli)
[![License](https://img.shields.io/npm/l/chec-cli.svg)](https://github.com/chec/chec-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g chec-cli
$ chec COMMAND
running command...
$ chec (-v|--version|version)
chec-cli/0.0.0 darwin-x64 node-v13.0.1
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

## `chec demo-store [STORE] [TARGETDIRECTORY]`

Create a demo store using Chec.io and Commerce.js

```
USAGE
  $ chec demo-store [STORE] [TARGETDIRECTORY]

ARGUMENTS
  STORE            The store that you want your example based off of
  TARGETDIRECTORY  The destination directory name to download the example to. The defaults to the store name

OPTIONS
  --env=env  Extra env variables to set for a .env file in the installed project

DESCRIPTION
  This command will download an example project from GitHub and initialise it on your machine. You will be free to edit 
  the downloaded code and play around with Commerce.js in client code
```

_See code: [src/commands/demo-store.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/demo-store.js)_

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
  Communicates with Chec.io to get full log information for the given log ID
```

_See code: [src/commands/log.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/log.js)_

## `chec login`

Log into your Chec.io account

```
USAGE
  $ chec login

OPTIONS
  -e, --email=email        Your accounts email address
  -p, --password=password  The password to login with
  --skip-check             Indicate that this command should skip checking if a user is already logged in

DESCRIPTION
  Log into your Chec.io account to enable commands that require API access.
```

_See code: [src/commands/login.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/login.js)_

## `chec logout`

Log out of your account

```
USAGE
  $ chec logout

DESCRIPTION
  Log out of your account and remove the local copy of your API keys.
```

_See code: [src/commands/logout.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/logout.js)_

## `chec logs`

Show a summary of your API requests processed by Chec.io

```
USAGE
  $ chec logs

OPTIONS
  -f, --[no-]follow      "Follow" logs from Chec.io. New events that happen are shown live
  -h, --history=history  [default: 100] Keep record of the given number of logs when browsing back.
  -n, --tail=tail        Show the last n number of logs before listening for new logs
  --utc                  Display timestamps in UTC timezone

DESCRIPTION
  Listens for logs from Chec.io and displays a summary of them to you as they are processed by Chec.
  You may optionally retrieve prior logs and navigate through shown logs to fetch further details about the log entry 
  from Chec.io.
```

_See code: [src/commands/logs.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/logs.js)_

## `chec register`

Register an account with Chec.io

```
USAGE
  $ chec register

OPTIONS
  -e, --email=email        Your accounts email address
  -p, --password=password  The password to login with

DESCRIPTION
  Create an account with Chec.io where you can manage products and pricing that is available through the Chec API
```

_See code: [src/commands/register.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/register.js)_

## `chec request METHOD RESOURCE [PAYLOAD]`

Run abstract API request

```
USAGE
  $ chec request METHOD RESOURCE [PAYLOAD]

ARGUMENTS
  METHOD    (GET|POST|PUT|DELETE) HTTP method
  RESOURCE  API resource (e.g. /v1/products)
  PAYLOAD   Request payload (JSON encoded)

DESCRIPTION
  Runs an arbitrary API request given the HTTP method, endpoint, and input payload.

  Data should be provided as a JSON object.

EXAMPLES
  $ chec request GET /v1/products
  $ chec request GET /v1/orders
  $ chec request GET /v1/products '{"limit":1}'
```

_See code: [src/commands/request.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/request.js)_
<!-- commandsstop -->
