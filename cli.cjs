#!/usr/bin/env node

const process = require('node:process');
const { parseArgs } = require('node:util');

const { parseIpodUpdaterFiles } = require('./core.cjs');


const args = process.argv.slice(2);
const options = {
  'input': {
    type: 'string',
    short: 'i',
  },
  'output': {
    type: 'string',
    short: 'o',
    default: './ipsw/',
  },
};

const { values } = parseArgs({ args: args, options });

if (typeof values.input !== 'string') {
  console.error(`ipod-updater-to-ipsw - commandline tool to extract ipsw files from Ipod Updater.app
  
  Usage:

    ipod-updater-to-ipsw --input "<path to Ipod Updater.app>" --output "./ipsw"

  Options:
    -i, --input    path to Ipod Updater.app
    -o, --output   path to output directory, where ipsw files will be stored. (default="./ipsw/")
`);

  return;
}

parseIpodUpdaterFiles(values.input, values.output);
