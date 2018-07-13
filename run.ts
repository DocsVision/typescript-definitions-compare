
import * as fs from 'fs';
import * as path from 'path';
import * as commandLineArgs from 'command-line-args';
import * as commandLineUsage from 'command-line-usage';
import * as camelcase from 'camelcase';
import { AppLogger, AppLoggerOptions } from "./utils/app-logger";
import { loadNodes } from "./utils/load-nodes";
import { checkCompability } from './utils/check-compability';
import { DeclarationNode } from './utils/declaration-node';
import { Config } from "./utils/config-interface";

var pjson = require('./package.json');

const optionDefinitions = [
    { name: 'verbose', type: Boolean },
    { name: 'version', alias: 'v', type: Boolean },
    { name: 'help', alias: 'h', type: Boolean },
    { name: 'config', alias: 'c', type: String },
    { name: 'previous', alias: 'p', type: String  },
    { name: 'next', alias: 'n', type: String },
    { name: 'out', alias: 'o', type: String },
    { name: 'flat-out', alias: 'f', type: String },
    { name: 'ignore', alias: 'i', type: String },
    { name: 'map-source-dir', alias: 'm', type: String },
    { name: 'exclude-root-node', type: Boolean }
  ];

  const options = commandLineArgs(optionDefinitions)

  const version = pjson.version;

  const help = [
    {
      header: 'Typescript definitions compare (typedc) by Docvision ' + version,
      content: pjson.description
    },
    {
        header: 'Usage',
        content: 'typedc -p <path-to-previous-json> -n <path-to-current-json> [options]'
    },
    {
      header: 'Options',
      optionList: [
        {
            name: 'config',
            alias: 'c',
            typeLabel: '{underline file}',
            description: 'Path to config file.'
        },
        {
            name: 'previous',
            alias: 'p',
            typeLabel: '{underline file}',
            description: 'Path to JSON file generated by typedoc from previous version of product sources.'
        },
        {
            name: 'next',
            alias: 'n',
            typeLabel: '{underline file}',
            description: 'Path to JSON file generated by typedoc from current version of product sources.'
        },
        {
            name: 'out',
            alias: 'o',
            typeLabel: '{underline file}',
            description: 'Path to file where human readably output will be written. If not specified information will be written in console output.'
        },
        {
            name: 'flat-out',
            alias: 'f',
            typeLabel: '{underline file}',
            description: 'Path to file where JSON output will be written. Usefull for writting ignore file. If not specified information will be written in console output.'
        },
        {
            name: 'ignore',
            alias: 'i',
            typeLabel: '{underline file}',
            description: 'Path to JSON file with ignore rules. Content of the file matches flat-out format, but can also contains GLOB in values.'
        },
        {
            name: 'map-source-dir',
            alias: 'm',
            typeLabel: '{underline file}',
            description: 'Folder with project sources. Path to these sources will be displayed in output.'
        },
        {
            name: 'exclude-root-node',
            description: 'Exclude from nodes patch root node name.'
        },
        {
            name: 'verbose',
            description: 'Print to output verbose debug information.'
        },
        {
            name: 'version',
            alias: 'v',
            description: 'Print current version.'
        },
        {
          name: 'help',
          alias: 'h',
          description: 'Print this usage guide.'
        }
      ]
    }
  ]
const usage = commandLineUsage(help)

// Read config and command line options
let config = {} as Config;
if (options.config) {
    config = JSON.parse(fs.readFileSync(options.config, 'utf-8'));
}
// Options has priority over config
for (let opt in options) {
    config[camelcase(opt)] = options[opt];
}

console.log(config);


if (config.version) {
    console.log('typedc ' + version);
}

if (config.previous && config.next) {
    if (options.help) {
        console.log(usage)
    }

    let srcOld = JSON.parse(fs.readFileSync(config.previous, 'utf-8'));
    let srcNew = JSON.parse(fs.readFileSync(config.next, 'utf-8'));
    let ignores = [];
    if (config.ignore) {
        ignores = JSON.parse(fs.readFileSync(config.ignore, 'utf-8'));
    }

    if (config.excludeRootNode) {
        srcOld.name = "";
        srcNew.name = "";
    }


    let oldNodes = [];
    loadNodes(srcOld, [], oldNodes);
    let newNodes = [];
    loadNodes(srcNew, [], newNodes);

    if (config.out && fs.existsSync(config.out)) {
        fs.unlinkSync(config.out);
    }
    if (config.flatOut && fs.existsSync(config.flatOut)) {
        fs.unlinkSync(config.flatOut);
        fs.writeFileSync(options.flatOutFile, '[')
    }

    var log = new AppLogger({
        ignoreRules: ignores,
        outFile: config.out,
        flatOutFile: config.flatOut,
        mapToSourceDir: config.mapSourceDir,
        verboseOut: config.verbose
    });

    log.verbose("Found " + oldNodes && oldNodes.length + " entities in release version");

    let oldRoot = { name: 'old', children: oldNodes } as DeclarationNode;
    let newRoot = { name: 'new', children: newNodes } as DeclarationNode;
    checkCompability(oldRoot, newRoot, log);

    

    if (log.countOfIssues > 0) {
        throw new Error(`There are ${log.countOfIssues} compability issues`);
    }
} else {
    console.log(usage)
}