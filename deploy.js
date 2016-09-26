#!/usr/bin/env node
"use strict";

var spawn = require('child_process').spawn;
var path = require('path');
var fs = require('fs');
var Client = require('ssh2').Client;
var scp2 = require('scp2');

var MAVEN = 'mvn';

module.exports = main;

if (!module.parent)
  main(process.argv.slice(2));

function main(argv) {
  var optimist = require("optimist");

  var options = optimist(argv)
        .usage("Usage: $0 <PROJECT_DIR> [CONFIG_NAME] [--help]")
        .alias("c", "controller")
        .default("controller", "localhost")
        .describe("controller", "IP address of SDN controller")
        .alias("p", "port")
        .default("port", 8101)
        .describe("port", "SSH port of the SDN controller")
        .alias("l", "login")
        .default("login", "karaf")
        .describe("login", "SSH login name of the SDN controller")
        .alias("P", "password")
        .default("password", "karaf")
        .describe("password", "SSH password of the SDN controller")
        .alias("f", "force")
        .boolean("force")
        .describe("force", "Force to rebuilding the project.")
        .boolean("help")
        .describe("help", "Show command line options.");

  if (options.argv.help || !options.argv._.length) {
    options.showHelp();
    return;
  }

  var root = options.argv._[0];

  var source = path.join(root, 'features/target');
  var kar = fs.existsSync(source) &&
        fs.readdirSync(source).find(function(f) {
    return f.endsWith('.kar');
  });
  if (!options.argv.force && kar) {
    uploadKarViaSSH(path.join(source, kar), options.argv);
    return;
  }

  var build = spawn(MAVEN, ["clean", "install", "-DskipTests"], {
    cwd: root,
    env: process.env
  });

  build.stdout.on('data', function(data) {
    process.stdout.write(`${data}`);
  });

  build.stderr.on('data', function(data) {
    process.stderr.write(`${data}`);
  });

  build.on('exit', function(code, signal) {
    if (code) {
      console.log(`Exit code (${code})`);
      return;
    }
    var kar = fs.readdirSync(source).find(function(f) {
      return f.endsWith('.kar');
    });
    if (kar) {
      uploadKarViaSSH(path.join(source, kar), options.argv);
    }
  });
}

function uploadKarViaSSH(kar, controller) {
  var conn = new scp2.Client({
    host: controller.controller,
    port: controller.port,
    username: controller.login,
    password: controller.password,
    algorithms: {
      kex: [ 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1' ],
      serverHostKey: [ 'ssh-rsa', 'ssh-dss' ]
    }
  });
  fs.readFile(kar, function(err, data) {
    if (err) throw err;
    var target = path.join('/data/tmp', path.basename(kar));
    conn.write({
      destination: target,
      content: data
    }, function(err) {
      if (err) throw err;
      deployKarViaSSH(target, controller);
    });
  });
}

function deployKarViaSSH(target, controller) {
  var conn = new Client();
  conn.on('ready', function() {
    console.log('Client :: ready');
    conn.shell(function(err, stream) {
      if (err) {
        stream.close();
      };
      stream.on('close', function() {
        // console.log('Stream :: close');
        conn.end();
        // console.log('Stream :: close successfully');
      }).on('data', function(data) {
        process.stderr.write(`${data}`);
      }).stderr.on('data', function(data) {
        process.stderr.write(`${data}`);
      });
      stream.end([
        'config:edit org.ops4j.pax.url.mvn',
        [
          'config:property-set',
          'org.ops4j.pax.url.mvn.defaultRepositories',
          '"file:${karaf.home}/${karaf.default.repository}@id=system.repository@snapshots,',
          'file:${karaf.data}/kar@id=kar.repository@multi@snapshots,',
          'file:${karaf.base}/${karaf.default.repository}@id=child.system.repository@snapshots"',
        ].join(' '),
        'config:update',
        'kar:install file:${karaf.home}' + target,
        'exit',
        ''
      ].join('\n'));
    });
  }).on('end', function() {
    // console.log('Client :: disconnected');
    console.log('[DevOpen - Maple] Deploy successfully!');
    process.exit(0);
  }).connect({
    host: controller.controller,
    port: controller.port,
    username: controller.login,
    password: controller.password,
    algorithms: {
      kex: [ 'diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1' ],
      serverHostKey: [ 'ssh-rsa', 'ssh-dss' ]
    }
  });
}
