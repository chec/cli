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
chec-cli/0.0.0 darwin-x64 node-v10.16.3
$ chec --help [COMMAND]
USAGE
  $ chec COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`chec help [COMMAND]`](#chec-help-command)
* [`chec register`](#chec-register)

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

## `chec register`

Register an account with Chec.io

```
USAGE
  $ chec register

OPTIONS
  -e, --email=email        Email address to register with
  -p, --password=password  Set the password to use when logging in

DESCRIPTION
  Create an account with Chec.io where you can manage products and pricing that is available through the Chec API
```

_See code: [src/commands/register.js](https://github.com/chec/chec-cli/blob/v0.0.0/src/commands/register.js)_
<!-- commandsstop -->
